const normalizePhone = (value = "") => {
  const trimmed = String(value).replace(/\s+/g, "");

  if (trimmed.startsWith("+234")) {
    return trimmed;
  }

  if (trimmed.startsWith("234")) {
    return `+${trimmed}`;
  }

  if (trimmed.startsWith("0")) {
    return `+234${trimmed.slice(1)}`;
  }

  return trimmed;
};

const normalizeLicenseNumber = (value = "") =>
  String(value).toUpperCase().replace(/[^A-Z0-9]/g, "");

const normalizePlateNumber = (value = "") => {
  const cleaned = String(value).toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (cleaned.length < 8) {
    return cleaned;
  }

  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}${cleaned.slice(6, 8)}`;
};

module.exports = {
  normalizePhone,
  normalizeLicenseNumber,
  normalizePlateNumber,
};
