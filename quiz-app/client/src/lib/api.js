const TOKEN_KEY = 'ql_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(method, url, body) {
  const res = await fetch('/api' + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

export const Api = {
  getToken,
  setToken,
  async register(username, password, role) {
    const { token, user } = await request('POST', '/auth/register', { username, password, role });
    setToken(token);
    return user;
  },
  async login(username, password) {
    const { token, user } = await request('POST', '/auth/login', { username, password });
    setToken(token);
    return user;
  },
  logout() { setToken(null); },
  async me() {
    const { user } = await request('GET', '/auth/me');
    return user;
  },
  listQuizzes: () => request('GET', '/quizzes').then(r => r.quizzes),
  createQuiz: quiz => request('POST', '/quizzes', quiz).then(r => r.quiz),
  updateQuiz: (id, quiz) => request('PUT', '/quizzes/' + id, quiz).then(r => r.quiz),
  deleteQuiz: id => request('DELETE', '/quizzes/' + id),
  history: () => request('GET', '/history').then(r => r.history),
};
