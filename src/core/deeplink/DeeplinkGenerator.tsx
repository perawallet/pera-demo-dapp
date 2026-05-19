import {useMemo, useState} from "react";
import {QRCodeSVG} from "qrcode.react";
import {
  Alert,
  Box,
  Button,
  Link,
  MenuItem,
  TextField,
  Typography
} from "@mui/material";

import {
  DEEP_LINKS,
  ParameterDefinition,
  DeeplinkDefinition
} from "./deeplink_config";

// ---------- Base prefixes for each link type ----------
const BASE = {
  new: "perawallet://app/",
  old: "perawallet://",
  universal: "https://perawallet.app/qr/perawallet/app/"
};

type LinkType = "new" | "old" | "universal";

const LINK_TYPES: {key: LinkType; label: string}[] = [
  {key: "new", label: "New Style (after upgrade)"},
  {key: "old", label: "Old Style (previous app versions)"},
  {key: "universal", label: "Universal Link (web-based links)"}
];

const QR_CODE_SIZE = 200;

const DeeplinkGenerator = () => {
  const [linkType, setLinkType] = useState<LinkType>("new");
  const [destinationKey, setDestinationKey] = useState("");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [error, setError] = useState("");

  const destination = useMemo<DeeplinkDefinition | undefined>(
    () => DEEP_LINKS.find((d) => d.key === destinationKey),
    [destinationKey]
  );

  const handleChange = (id: string, value: string) => {
    setInputs((prev) => ({...prev, [id]: value}));
  };

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

  const isAbsolute = (s: string) => {
    return /:\/\//.test(s) || /^[a-zA-Z]+:/.test(s);
  };

  const generate = () => {
    setError("");
    setGeneratedUrl("");
    if (!destination) return;

    const tmpl =
      destination?.templates?.[linkType] ??
      destination.templates?.universal ??
      destination.templates?.new;

    if (!tmpl) {
      setError("This destination doesn't define a template for the selected link type.");
      return;
    }

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
    <Box sx={{display: "flex", flexDirection: "column", gap: 2}}>
      <TextField
        select={true}
        label={"Link Type"}
        value={linkType}
        onChange={(e) => setLinkType(e.target.value as LinkType)}
        fullWidth={true}>
        {LINK_TYPES.map((lt) => (
          <MenuItem key={lt.key} value={lt.key}>
            {lt.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select={true}
        label={"Destination"}
        value={destinationKey}
        onChange={(e) => {
          setDestinationKey(e.target.value);
          setInputs({});
          setGeneratedUrl("");
          setError("");
        }}
        fullWidth={true}>
        <MenuItem value={""}>
          <em>{"-- Select --"}</em>
        </MenuItem>
        {DEEP_LINKS.map((d) => (
          <MenuItem key={d.key} value={d.key}>
            {d.name}
          </MenuItem>
        ))}
      </TextField>

      {destination &&
        (destination.params || []).map((p) => (
          <TextField
            key={p.id}
            name={p.id}
            label={p.label || p.id}
            required={p.required}
            value={inputs[p.id] || ""}
            onChange={(e) => handleChange(p.id, e.target.value)}
            placeholder={p.id}
            fullWidth={true}
          />
        ))}

      <Button onClick={generate} variant={"contained"} fullWidth={true}>
        {"Generate"}
      </Button>

      {error && <Alert severity={"error"}>{error}</Alert>}

      {generatedUrl && (
        <Box sx={{display: "flex", flexDirection: "column", gap: 2, mt: 1}}>
          <Typography
            variant={"body2"}
            sx={{wordBreak: "break-all"}}>
            <Link href={generatedUrl} target={"_blank"} rel={"noopener noreferrer"}>
              {generatedUrl}
            </Link>
          </Typography>
          <Box>
            <QRCodeSVG value={generatedUrl} size={QR_CODE_SIZE} />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default DeeplinkGenerator;
