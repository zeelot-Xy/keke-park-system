const createResponse = () => {
  const res = {
    statusCode: 200,
    cookies: [],
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    cookie(name, value, options) {
      this.cookies.push({ name, value, options });
      return this;
    },
    clearCookie(name, options) {
      this.cookies.push({ name, cleared: true, options });
      return this;
    },
  };

  return res;
};

module.exports = { createResponse };
