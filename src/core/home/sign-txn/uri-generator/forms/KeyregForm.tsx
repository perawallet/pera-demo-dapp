import {Box, TextField} from "@mui/material";

import {buildKeyregUri, type UriNetwork} from "../builders";

interface KeyregFormProps {
  values: {
    address: string;
    votekey: string;
    selkey: string;
    sprfkey: string;
    votefst: string;
    votelst: string;
    votekd: string;
    fee: string;
    note: string;
    xnote: string;
  };
  network?: UriNetwork;
  onChange: (next: KeyregFormProps["values"]) => void;
  onUriChange: (uri: string) => void;
}

const KeyregForm = ({values, network, onChange, onUriChange}: KeyregFormProps) => {
  const set = <K extends keyof typeof values>(key: K, v: string) => {
    const next = {...values, [key]: v};

    onChange(next);
    onUriChange(
      next.address
        ? buildKeyregUri({
            address: next.address,
            votekey: next.votekey || undefined,
            selkey: next.selkey || undefined,
            sprfkey: next.sprfkey || undefined,
            votefst: next.votefst || undefined,
            votelst: next.votelst || undefined,
            votekd: next.votekd || undefined,
            fee: next.fee || undefined,
            note: next.note || undefined,
            xnote: next.xnote || undefined,
            network
          })
        : ""
    );
  };

  return (
    <Box sx={{display: "flex", flexDirection: "column", gap: 2}}>
      <TextField
        label={"Address (required)"}
        name={"address"}
        value={values.address}
        onChange={(e) => set("address", e.target.value)}
        size={"small"}
        fullWidth={true}
      />

      <TextField
        label={"Vote Key (votekey)"}
        name={"votekey"}
        value={values.votekey}
        onChange={(e) => set("votekey", e.target.value)}
        size={"small"}
        fullWidth={true}
      />

      <TextField
        label={"Selection Key (selkey)"}
        name={"selkey"}
        value={values.selkey}
        onChange={(e) => set("selkey", e.target.value)}
        size={"small"}
        fullWidth={true}
      />

      <TextField
        label={"State Proof Key (sprfkey)"}
        name={"sprfkey"}
        value={values.sprfkey}
        onChange={(e) => set("sprfkey", e.target.value)}
        size={"small"}
        fullWidth={true}
      />

      <TextField
        label={"Vote First Round (votefst)"}
        name={"votefst"}
        value={values.votefst}
        onChange={(e) => set("votefst", e.target.value)}
        size={"small"}
        fullWidth={true}
      />

      <TextField
        label={"Vote Last Round (votelst)"}
        name={"votelst"}
        value={values.votelst}
        onChange={(e) => set("votelst", e.target.value)}
        size={"small"}
        fullWidth={true}
      />

      <TextField
        label={"Vote Key Dilution (votekd)"}
        name={"votekd"}
        value={values.votekd}
        onChange={(e) => set("votekd", e.target.value)}
        size={"small"}
        fullWidth={true}
      />

      <TextField
        label={"Fee"}
        name={"fee"}
        value={values.fee}
        onChange={(e) => set("fee", e.target.value)}
        size={"small"}
        fullWidth={true}
      />

      <TextField
        label={"Note"}
        name={"note"}
        value={values.note}
        onChange={(e) => set("note", e.target.value)}
        size={"small"}
        fullWidth={true}
      />

      <TextField
        label={"xnote (encrypted note)"}
        name={"xnote"}
        value={values.xnote}
        onChange={(e) => set("xnote", e.target.value)}
        size={"small"}
        fullWidth={true}
      />
    </Box>
  );
};

export default KeyregForm;
