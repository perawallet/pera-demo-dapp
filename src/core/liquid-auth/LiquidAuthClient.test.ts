import { encode as cborEncode } from "cbor-x";
import { toBase64URL } from "./arc0027";
import { LiquidAuthClient } from "./LiquidAuthClient";

// A fake SignalClient that lets the test drive link-message + data channel.
class FakeSignalClient {
  listeners: Record<string, (arg: any) => void> = {};
  sent: string[] = [];
  channel = {
    send: (d: string) => this.sent.push(d),
    onmessage: null as null | ((e: { data: string }) => void),
    onclose: null as null | (() => void),
    onerror: null as null | (() => void),
    close: () => {}
  };
  constructor(public url: string) {}
  on(event: string, cb: (arg: any) => void) { this.listeners[event] = cb; }
  deepLink(requestId?: string) { return `liquid://host/?requestId=${requestId}`; }
  async peer() { return this.channel as unknown as RTCDataChannel; }
  close() {}
  emitLink(wallet: string) { this.listeners["link-message"]?.({ wallet }); }
  inbound(frame: string) { this.channel.onmessage?.({ data: frame }); }
}

const makeClient = () => {
  const fake = new FakeSignalClient("https://host");
  const client = new LiquidAuthClient("https://host", () => fake as any);
  return { fake, client };
};

describe("LiquidAuthClient", () => {
  it("connect resolves the wallet address from link-message", async () => {
    const { fake, client } = makeClient();
    const onQr = jest.fn();
    const p = client.connect(onQr);
    expect(onQr).toHaveBeenCalledWith(expect.objectContaining({ deepLink: expect.any(String), requestId: expect.any(String) }));
    fake.emitLink("WALLETADDR");
    const accounts = await p;
    expect(accounts).toEqual(["WALLETADDR"]);
  });

  it("request resolves when a matching response frame arrives", async () => {
    const { fake, client } = makeClient();
    const p = client.connect(jest.fn());
    fake.emitLink("WALLETADDR");
    await p;
    const responsePromise = client.request("msg-1", "FRAME_OUT");
    expect(fake.sent).toContain("FRAME_OUT");
    const responseEnv = { id: "y", reference: "arc0027:sign_transactions:response", requestId: "msg-1", result: { stxns: ["AQID"] } };
    fake.inbound(toBase64URL(cborEncode(responseEnv)));
    const result = await responsePromise;
    expect(result).toEqual({ stxns: ["AQID"] });
  });

  it("request rejects with an Arc0027Error when the response carries an error", async () => {
    const { fake, client } = makeClient();
    const p = client.connect(jest.fn());
    fake.emitLink("WALLETADDR");
    await p;
    const responsePromise = client.request("msg-2", "FRAME");
    const env = { id: "z", reference: "arc0027:sign_transactions:response", requestId: "msg-2", error: { code: 4001, message: "no" } };
    fake.inbound(toBase64URL(cborEncode(env)));
    await expect(responsePromise).rejects.toMatchObject({ code: 4001 });
  });

  it("ignores empty heartbeat frames", async () => {
    const { fake, client } = makeClient();
    const p = client.connect(jest.fn());
    fake.emitLink("W");
    await p;
    expect(() => fake.inbound("")).not.toThrow();
  });

  const flush = () => new Promise((r) => setTimeout(r, 0));

  it("sends a negotiation offer and resolves after the wallet selects arc0027", async () => {
    const { fake, client } = makeClient();
    const negotiation = {
      protocols: [{ id: "arc0027" as const, versions: ["1.0"] }],
      peer: { name: "Demo", origin: "https://demo.test" }
    };
    const p = client.connect(jest.fn(), negotiation);
    fake.emitLink("ADDR");
    await flush();

    const offer = JSON.parse(fake.sent[0]);
    expect(offer.reference).toBe("liquidauth:negotiate:offer");
    expect(offer.params.protocols).toEqual([{ id: "arc0027", versions: ["1.0"] }]);

    fake.inbound(
      JSON.stringify({
        id: "sel-1",
        reference: "liquidauth:negotiate:select",
        requestId: offer.id,
        result: { handshakeVersion: 1, protocol: { id: "arc0027", version: "1.0" } }
      })
    );

    const accounts = await p;
    expect(accounts).toEqual(["ADDR"]);
    expect(client.protocol).toBe("arc0027");
  });

  it("rejects connect when the wallet returns a no-common-protocol error", async () => {
    const { fake, client } = makeClient();
    const negotiation = {
      protocols: [{ id: "walletconnect" as const, versions: ["2.0"] }],
      peer: { name: "Demo" }
    };
    const p = client.connect(jest.fn(), negotiation);
    fake.emitLink("ADDR");
    await flush();

    const offer = JSON.parse(fake.sent[0]);
    fake.inbound(
      JSON.stringify({
        id: "sel-2",
        reference: "liquidauth:negotiate:select",
        requestId: offer.id,
        error: { code: 5000, message: "No mutually supported protocol" }
      })
    );

    await expect(p).rejects.toMatchObject({ code: 5000 });
  });
});
