export default function TopBar({ user, room, onLeaveRoom, onLogout }) {
  return (
    <div className="topbar">
      <div className="logo">
        <span className="logo-mark" />
        QuizLive
      </div>
      <div className="who">
        {room?.code ? (
          <>
            <span className={`pill ${room.isHost ? 'on' : ''}`}>{room.isHost ? 'Организатор' : 'Игрок'}</span>
            <span>{room.nickname}</span>
            <button className="chip-btn" onClick={onLeaveRoom}>Выйти из комнаты</button>
          </>
        ) : user ? (
          <>
            <span className="pill">{user.role === 'organizer' ? 'Организатор' : 'Участник'}</span>
            <span>{user.username}</span>
            <button className="chip-btn" onClick={onLogout}>Выйти</button>
          </>
        ) : null}
      </div>
    </div>
  );
}
