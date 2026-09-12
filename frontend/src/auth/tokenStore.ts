let inMemoryToken: string | null = null;

export const tokenStore = {
  get: () => inMemoryToken,
  set: (token: string) => {
    inMemoryToken = token;
  },
  clear: () => {
    inMemoryToken = null;
  },
};
