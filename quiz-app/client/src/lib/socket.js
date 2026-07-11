import { io } from 'socket.io-client';

// Одно соединение на всё приложение; подключается к тому же origin,
// с которого раздан сам сайт (в проде — тот же Node-сервер).
export const socket = io({ autoConnect: true });
