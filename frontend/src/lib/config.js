export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

export const resolveAssetUrl = (value) => {
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${API_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};
