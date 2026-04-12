const buildCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
});

const setAuthCookies = (res, accessToken, refreshToken) => {
  const options = buildCookieOptions();
  res.cookie("accessToken", accessToken, options);
  res.cookie("refreshToken", refreshToken, options);
};

const clearAuthCookies = (res) => {
  const options = buildCookieOptions();
  res.clearCookie("accessToken", options);
  res.clearCookie("refreshToken", options);
};

module.exports = {
  setAuthCookies,
  clearAuthCookies,
};
