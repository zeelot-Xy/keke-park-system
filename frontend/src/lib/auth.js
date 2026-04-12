const ACCESS_TOKEN_KEY = "kekeParkAccessToken";
const REFRESH_TOKEN_KEY = "kekeParkRefreshToken";

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY) || "";

export const getRefreshToken = () =>
  localStorage.getItem(REFRESH_TOKEN_KEY) || "";

export const setAuthTokens = ({ accessToken, refreshToken }) => {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

export const clearAuthTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};
