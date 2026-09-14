import './styles/index.css';
import { renderApp, initializeApp } from './App';

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  app.innerHTML = renderApp();
  const cleanup = initializeApp();
  if (import.meta.hot) import.meta.hot.dispose(cleanup);
}
