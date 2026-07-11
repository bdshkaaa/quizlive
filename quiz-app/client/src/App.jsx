import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import TopBar from './components/TopBar';
import Auth from './views/Auth';
import MyQuizzes from './views/MyQuizzes';
import QuizBuilder from './views/QuizBuilder';
import HostRoom from './views/HostRoom';
import ParticipantHome from './views/ParticipantHome';
import PlayRoom from './views/PlayRoom';
import OrganizerHistory from './views/OrganizerHistory';
import { Api } from './lib/api';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home');
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [session, setSession] = useState(null); // { code, isHost, nickname, quiz? }

  useEffect(() => {
    if (!Api.getToken()) { setBooting(false); return; }
    Api.me()
      .then(u => { setUser(u); setView(u.role === 'organizer' ? 'myquizzes' : 'home'); })
      .catch(() => Api.setToken(null))
      .finally(() => setBooting(false));
  }, []);

  function onAuthed(u) {
    setUser(u);
    setView(u.role === 'organizer' ? 'myquizzes' : 'home');
  }
  function logout() {
    Api.logout();
    setUser(null);
    setSession(null);
    setView('home');
  }
  function leaveRoom() {
    setSession(null);
    setView(user?.role === 'organizer' ? 'myquizzes' : 'home');
  }

  if (booting) {
    return <div className="shell"><div className="wrap"><div className="card tight center muted"><span className="spin" /> Загружаю…</div></div></div>;
  }

  if (!user) {
    return (
      <div className="shell">
        <TopBar />
        <div className="wrap"><Auth onAuthed={onAuthed} /></div>
      </div>
    );
  }

  return (
    <div className="shell">
      <TopBar user={user} room={session} onLeaveRoom={leaveRoom} onLogout={logout} />
      <div className="wrap">
        <AnimatePresence mode="wait">
          {view === 'myquizzes' && (
            <MyQuizzes
              key="myquizzes"
              onCreate={() => { setEditingQuiz(null); setView('build'); }}
              onEdit={quiz => { setEditingQuiz(quiz); setView('build'); }}
              onHistory={() => setView('orghistory')}
              onLaunch={quiz => { setEditingQuiz(quiz); setSession({ isHost: true, nickname: user.username }); setView('host'); }}
            />
          )}

          {view === 'orghistory' && (
            <OrganizerHistory key="orghistory" onBack={() => setView('myquizzes')} />
          )}

          {view === 'build' && (
            <QuizBuilder key="build" existing={editingQuiz} onDone={() => setView('myquizzes')} />
          )}

          {view === 'host' && session && (
            <HostRoom
              key="host"
              quiz={editingQuiz}
              onExit={() => { setSession(null); setView('myquizzes'); }}
            />
          )}

          {view === 'home' && user.role === 'participant' && (
            <ParticipantHome
              key="home"
              user={user}
              onJoined={(code, nickname, quizTitle) => {
                setSession({ code, isHost: false, nickname, quizTitle });
                setView('play');
              }}
            />
          )}

          {view === 'play' && session && (
            <PlayRoom
              key="play"
              code={session.code}
              quizTitle={session.quizTitle}
              onExit={leaveRoom}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
