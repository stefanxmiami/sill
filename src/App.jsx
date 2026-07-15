import React from 'react';
import Tasks from './widgets/Tasks.jsx';
import DailyNote from './widgets/DailyNote.jsx';
import QuickCapture from './widgets/QuickCapture.jsx';
import RecentNotes from './widgets/RecentNotes.jsx';
import Settings from './widgets/Settings.jsx';

const WIDGETS = {
  tasks: Tasks,
  daily: DailyNote,
  capture: QuickCapture,
  recent: RecentNotes,
  settings: Settings,
};

export default function App() {
  const id = new URLSearchParams(window.location.search).get('widget') || 'tasks';
  const Widget = WIDGETS[id] || Tasks;
  return <Widget />;
}
