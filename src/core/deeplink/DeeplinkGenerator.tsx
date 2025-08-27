import "./_deeplink.scss";

import  { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { DEEP_LINKS, ParameterDefinition, DeeplinkDefinition} from "./deeplink_config"
import { Button, Input } from "@hipo/react-ui-toolkit";

// ---------- Base prefixes for each link type ----------
const BASE = {
  new: "perawallet://app/",
  old: "perawallet://",
  universal: "https://perawallet.app/qr/perawallet/app/",
};

const LINK_TYPES = [
  { key: "new", label: "New Style (after upgrade)" },
  { key: "old", label: "Old Style (previous app versions)" },
  { key: "universal", label: "Universal Link (web-based links)" },
];

const DeeplinkGenerator = () => {
  const [linkType, setLinkType] = useState<"new" | "old" | "universal">("new");
  const [destinationKey, setDestinationKey] = useState("");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [error, setError] = useState("");

  const destination = useMemo<DeeplinkDefinition | undefined>(() => DEEP_LINKS.find((d) => d.key === destinationKey), [destinationKey]);

  const handleChange = (id: string, value: string) => setInputs((prev) => ({ ...prev, [id]: value }));

  const substitute = (tmpl: string, params: ParameterDefinition[]) => {
    let out = tmpl;
    params.forEach((p) => {
      const token = (p.token || `$${p.id.toUpperCase()}`).toString();
      const value = encodeURIComponent(inputs[p.id] || "");
      // replace both $TOKEN and bare TOKEN to be resilient to CSV quirks
      const bare = token.startsWith("$") ? token.slice(1) : token;
      out = out.replaceAll(token, value).replaceAll(bare, value);
    });
    return out;
  };

  const isAbsolute = (s: string) => /:\/\//.test(s) || /^[a-zA-Z]+:/.test(s);

  const generate = () => {
    setError("");
    setGeneratedUrl("");
    if (!destination) return;

    // pick the template for the selected link type; fall back if needed
    const tmpl = destination?.templates?.[linkType] ?? destination.templates?.universal ?? destination.templates?.new;
    if (!tmpl) {
      setError("This destination doesn't define a template for the selected link type.");
      return;
    }

    // Basic required check
    for (const p of destination.params || []) {
      if (p.required && !inputs[p.id]) {
        setError(`Missing required field: ${p.label || p.id}`);
        return;
      }
    }

    const pathOrUrl = substitute(tmpl, destination.params || []);
    const finalUrl = isAbsolute(pathOrUrl) ? pathOrUrl : `${BASE[linkType]}${pathOrUrl}`;
    setGeneratedUrl(finalUrl);
  };

  return (
    <div className="deeplink__root">
        <div className="deeplink__row">
            <div className="deeplink__label">Link Type</div>
            <select
                value={linkType}
                onChange={(e) => setLinkType(e.target.value as "new" | "old" | "universal")}                
                className="deeplink__select"

            >
                {LINK_TYPES.map((lt) => (
                <option key={lt.key} value={lt.key}>
                    {lt.label}
                </option>
                ))}
            </select>
        </div>
        <div className="deeplink__row">
            <div className="deeplink__label">Destination</div>
            <select
                value={destinationKey}
                onChange={(e) => {
                setDestinationKey(e.target.value);
                setInputs({});
                setGeneratedUrl("");
                setError("");
                }}
                className="deeplink__select"
            >
                <option value="">-- Select --</option>
                {DEEP_LINKS.map((d) => (
                <option key={d.key} value={d.key}>
                    {d.name}
                </option>
                ))}
            </select>
        </div>

        {destination && (
            destination.params || []).map((p) => (
                <div key={p.id} className="deeplink__row">
                    <div className="deeplink__label">
                        {p.label || p.id}
                        {p.required && <span> *</span>}
                    </div>
                    <Input
                        name={p.id}
                        customClassName="deeplink__input"
                        value={inputs[p.id] || ""}
                        onChange={(e) => handleChange(p.id, e.currentTarget.value)}
                        placeholder={p.id}
                    />
                </div>
            )
        )}

        {/* Generate */}
        <Button customClassName="deeplink__button" onClick={generate}>Generate</Button>

        {/* Output */}
        {error && <div className="deeplink__error">{error}</div>}
        {generatedUrl && (
        <div className="deeplink__output">
            <a href={generatedUrl}>{generatedUrl}</a>
            <div className="deeplink__qr">
                <QRCodeSVG value={generatedUrl} size={200} />
            </div>
        </div>
        )}
    </div>
  );
}

export default DeeplinkGenerator