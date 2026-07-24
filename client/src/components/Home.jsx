import React from 'react';
import PlanBuilder from './PlanBuilder';
import TaskManager from './TaskManager';
import './Home.css';

export default function Home({ token, userEmail, prefs, tasks, setTasks, showNotif, onOrientation }) {
  return (
    <div className="home-page">
      <PlanBuilder token={token} userEmail={userEmail} prefs={prefs} tasks={tasks} setTasks={setTasks}
        showNotif={showNotif} onOrientation={onOrientation} />
      <div className="home-divider" />
      <TaskManager userEmail={userEmail} tasks={tasks} setTasks={setTasks} />
    </div>
  );
}
