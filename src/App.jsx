import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Plus,
  Users,
  CheckCircle,
  XCircle,
  Calendar,
  LayoutDashboard,
  Database,
  Unlock,
  Save,
  X,
  Trash2,
  Filter,
  LogOut,
  LogIn,
  AlertCircle,
} from 'lucide-react';

// --- FIREBASE CONFIGURATION ---
// These are your specific project keys
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyDPE8NTz21mQ13hVBlJc9FA7fp8ngY9h3w',
  authDomain: 'coa-commission-tracker.firebaseapp.com',
  projectId: 'coa-commission-tracker',
  storageBucket: 'coa-commission-tracker.firebasestorage.app',
  messagingSenderId: '754155671764',
  appId: '1:754155671764:web:6c7837fdcd4a5a13702b41',
  measurementId: 'G-7PYCLGG8KH',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'coa-commission-tracker';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [commissioners, setCommissioners] = useState([]);
  const [meetings, setMeetings] = useState([]);

  // UI States
  const [isAddingMeeting, setIsAddingMeeting] = useState(false);
  const [isAddingCommissioner, setIsAddingCommissioner] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // --- Secure Admin Check ---
  const isAdmin = user && !user.isAnonymous;

  // --- Auth Setup ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        signInAnonymously(auth).catch((err) =>
          console.error('Anon auth failed:', err)
        );
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Real-time Data Listeners ---
  useEffect(() => {
    if (!user) return;

    const commRef = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'commissioners'
    );
    const unsubscribeComm = onSnapshot(
      commRef,
      (snapshot) => {
        setCommissioners(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      },
      (err) => console.error('Firestore error:', err)
    );

    const meetRef = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'meetings'
    );
    const unsubscribeMeet = onSnapshot(
      meetRef,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMeetings(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
      },
      (err) => console.error('Firestore error:', err)
    );

    return () => {
      unsubscribeComm();
      unsubscribeMeet();
    };
  }, [user]);

  // --- Auth Actions ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setIsLoginModalOpen(false);
    } catch (err) {
      setLoginError('Invalid email or password. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // --- Database Actions ---
  const handleAddMeeting = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    const formData = new FormData(e.target);
    const initialVotes = {};
    commissioners.forEach((c) => (initialVotes[c.id] = 'Yes'));

    const newMeeting = {
      date: formData.get('date'),
      title: formData.get('title'),
      items: [
        {
          id: crypto.randomUUID(),
          title: formData.get('itemTitle'),
          category: formData.get('category'),
          description: formData.get('description'),
          status: 'Passed',
          votes: initialVotes,
        },
      ],
    };

    await addDoc(
      collection(db, 'artifacts', appId, 'public', 'data', 'meetings'),
      newMeeting
    );
    setIsAddingMeeting(false);
  };

  const handleAddCommissioner = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    const formData = new FormData(e.target);
    const newComm = {
      name: formData.get('name'),
      district: formData.get('district'),
      image:
        formData.get('image') ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          formData.get('name')
        )}&background=random`,
      party: formData.get('party') || 'Non-partisan',
    };
    await addDoc(
      collection(db, 'artifacts', appId, 'public', 'data', 'commissioners'),
      newComm
    );
    setIsAddingCommissioner(false);
  };

  const deleteCommissioner = async (id) => {
    if (!isAdmin || !window.confirm('Remove this commissioner?')) return;
    await deleteDoc(
      doc(db, 'artifacts', appId, 'public', 'data', 'commissioners', id)
    );
  };

  const updateVote = async (meetingId, itemIndex, commId, current) => {
    if (!isAdmin) return;
    const meeting = meetings.find((m) => m.id === meetingId);
    const updatedItems = [...meeting.items];
    updatedItems[itemIndex].votes[commId] = current === 'Yes' ? 'No' : 'Yes';
    await updateDoc(
      doc(db, 'artifacts', appId, 'public', 'data', 'meetings', meetingId),
      { items: updatedItems }
    );
  };

  const toggleItemStatus = async (meetingId, itemIndex) => {
    if (!isAdmin) return;
    const meeting = meetings.find((m) => m.id === meetingId);
    const updatedItems = [...meeting.items];
    updatedItems[itemIndex].status =
      updatedItems[itemIndex].status === 'Passed' ? 'Failed' : 'Passed';
    await updateDoc(
      doc(db, 'artifacts', appId, 'public', 'data', 'meetings', meetingId),
      { items: updatedItems }
    );
  };

  const stats = useMemo(() => {
    const allItems = meetings.flatMap((m) =>
      (m.items || []).map((i) => ({ ...i, date: m.date }))
    );
    const counts = {};
    allItems.forEach(
      (i) => (counts[i.category] = (counts[i.category] || 0) + 1)
    );
    return {
      total: allItems.length,
      passed: allItems.filter((i) => i.status === 'Passed').length,
      chart: Object.entries(counts).map(([name, value]) => ({ name, value })),
    };
  }, [meetings]);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white h-screen fixed hidden md:flex flex-col p-6 shadow-2xl z-30">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-500/20">
            <Database size={24} />
          </div>
          <h1 className="font-black text-2xl tracking-tighter">CivicWatch</h1>
        </div>

        <nav className="space-y-2 flex-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'commissioners', label: 'Commissioners', icon: Users },
            { id: 'meetings', label: 'Archive', icon: Calendar },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 translate-x-1'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-5 bg-slate-800/40 rounded-[28px] border border-slate-700/50">
          {isAdmin ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-orange-400 text-xs font-black uppercase tracking-widest">
                <Unlock size={14} /> Admin Active
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-red-600 text-white rounded-xl transition-all text-xs font-bold"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-900/40"
            >
              <LogIn size={14} /> Admin Login
            </button>
          )}
          <div className="mt-4 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
              Live: Alamogordo
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-6 md:p-12 lg:p-16">
        <header className="mb-14 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-2">
              {activeTab === 'dashboard'
                ? 'City Pulse'
                : activeTab === 'commissioners'
                ? 'Representatives'
                : 'Archives'}
            </h2>
            <p className="text-slate-500 font-semibold text-lg">
              Civic accountability platform.
            </p>
          </div>

          <div className="flex gap-4">
            {isAdmin && activeTab === 'meetings' && (
              <button
                onClick={() => setIsAddingMeeting(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-[20px] font-black flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all"
              >
                <Plus size={20} /> Log Vote
              </button>
            )}
            {isAdmin && activeTab === 'commissioners' && (
              <button
                onClick={() => setIsAddingCommissioner(true)}
                className="bg-orange-500 text-white px-6 py-3 rounded-[20px] font-black flex items-center gap-2 hover:bg-orange-600 shadow-xl shadow-orange-500/20 transition-all"
              >
                <Plus size={20} /> New Member
              </button>
            )}
          </div>
        </header>

        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-white p-10 rounded-[44px] border border-slate-100 shadow-sm flex flex-col">
              <h3 className="text-xl font-black text-slate-800 mb-10 flex items-center gap-2">
                <Filter size={20} className="text-blue-500" /> Topics
              </h3>
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.chart}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={10}
                      dataKey="value"
                      stroke="none"
                    >
                      {stats.chart.map((e, i) => (
                        <Cell
                          key={i}
                          fill={
                            [
                              '#3b82f6',
                              '#10b981',
                              '#f59e0b',
                              '#ef4444',
                              '#8b5cf6',
                            ][i % 5]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '24px',
                        border: 'none',
                        boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex flex-col gap-10">
              <div className="bg-white p-10 rounded-[44px] border border-slate-100 shadow-sm group hover:border-blue-200 transition-all duration-300">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  Total Decisions
                </p>
                <p className="text-7xl font-black text-slate-900">
                  {stats.total}
                </p>
              </div>
              <div className="bg-white p-10 rounded-[44px] border border-slate-100 shadow-sm group hover:border-green-200 transition-all duration-300">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  Pass Rate
                </p>
                <p className="text-7xl font-black text-green-600">
                  {stats.total > 0
                    ? Math.round((stats.passed / stats.total) * 100)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Commissioners View */}
        {activeTab === 'commissioners' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {commissioners.map((comm) => (
              <div
                key={comm.id}
                className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
              >
                {isAdmin && (
                  <button
                    onClick={() => deleteCommissioner(comm.id)}
                    className="absolute top-6 right-6 text-slate-200 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <div className="flex flex-col items-center text-center">
                  <img
                    src={comm.image}
                    className="w-28 h-28 rounded-[32px] object-cover border-8 border-slate-50 mb-6 shadow-lg"
                    alt=""
                  />
                  <h3 className="font-black text-2xl text-slate-900 mb-1">
                    {comm.name}
                  </h3>
                  <p className="text-base text-slate-500 font-bold mb-4">
                    {comm.district}
                  </p>
                  <span className="px-4 py-1.5 bg-blue-50 text-blue-600 text-xs font-black uppercase rounded-full tracking-widest">
                    {comm.party}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Meeting Archive View */}
        {activeTab === 'meetings' && (
          <div className="space-y-12">
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
                className="bg-white rounded-[56px] border border-slate-100 shadow-sm overflow-hidden mb-8"
              >
                <div className="p-10 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <Calendar className="text-blue-600" size={24} />
                    <h3 className="font-black text-2xl text-slate-900">
                      {meeting.title} -{' '}
                      <span className="text-slate-400">{meeting.date}</span>
                    </h3>
                  </div>
                </div>
                {meeting.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-10 lg:p-14 border-b last:border-0"
                  >
                    <div className="flex flex-col lg:flex-row justify-between items-start mb-12 gap-10">
                      <div className="max-w-4xl">
                        <span className="text-[11px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full mb-5 inline-block">
                          {item.category}
                        </span>
                        <h4 className="text-3xl font-black text-slate-900 mb-5 leading-tight">
                          {item.title}
                        </h4>
                        <p className="text-slate-500 text-lg leading-relaxed font-medium">
                          {item.description}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleItemStatus(meeting.id, idx)}
                        disabled={!isAdmin}
                        className={`min-w-[150px] px-8 py-4 rounded-[24px] text-xs font-black uppercase tracking-[0.2em] transition-all ${
                          item.status === 'Passed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        } ${
                          isAdmin
                            ? 'hover:scale-105 active:scale-95'
                            : 'cursor-default'
                        }`}
                      >
                        {item.status}
                      </button>
                    </div>
                    <div className="bg-slate-50/70 p-8 rounded-[40px] grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-6">
                      {commissioners.map((comm) => (
                        <div key={comm.id} className="text-center group/voter">
                          <img
                            src={comm.image}
                            className="w-16 h-16 rounded-[20px] mx-auto object-cover border-4 border-white shadow-xl mb-3 transition-all group-hover/voter:scale-110"
                            alt=""
                          />
                          <p className="text-xs font-black text-slate-700 truncate mb-3">
                            {comm.name.split(' ').pop()}
                          </p>
                          {isAdmin ? (
                            <button
                              onClick={() =>
                                updateVote(
                                  meeting.id,
                                  idx,
                                  comm.id,
                                  item.votes[comm.id]
                                )
                              }
                              className={`text-[10px] font-black px-4 py-1.5 rounded-xl text-white shadow-md active:scale-90 ${
                                item.votes[comm.id] === 'Yes'
                                  ? 'bg-green-600 hover:bg-green-700'
                                  : 'bg-red-600 hover:bg-red-700'
                              }`}
                            >
                              {item.votes[comm.id]}
                            </button>
                          ) : (
                            <div
                              className={`text-[10px] font-black flex items-center justify-center gap-1 ${
                                item.votes[comm.id] === 'Yes'
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {item.votes[comm.id] === 'Yes' ? (
                                <CheckCircle size={12} />
                              ) : (
                                <XCircle size={12} />
                              )}{' '}
                              {item.votes[comm.id]}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* --- Login Modal --- */}
        {isLoginModalOpen && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[48px] w-full max-w-md p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                    Admin Portal
                  </h3>
                  <p className="text-slate-500 font-bold text-sm mt-1">
                    Authenticating for Commissioner updates.
                  </p>
                </div>
                <button
                  onClick={() => setIsLoginModalOpen(false)}
                  className="text-slate-300 hover:text-slate-600 transition-colors"
                >
                  <X size={32} />
                </button>
              </div>

              {loginError && (
                <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold animate-in shake duration-300">
                  <AlertCircle size={20} /> {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Email Address
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="admin@alamogordo.gov"
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Password
                  </label>
                  <input
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-slate-900 text-white py-6 rounded-[28px] font-black text-lg hover:bg-blue-600 transition-all shadow-2xl disabled:opacity-50"
                >
                  {isLoggingIn ? 'Signing In...' : 'Log In'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Data Forms */}
        {isAddingMeeting && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-50 flex items-center justify-center p-8 animate-in fade-in duration-300">
            <div className="bg-white rounded-[56px] w-full max-w-2xl p-12 shadow-2xl">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                  Log Meeting Entry
                </h3>
                <button
                  onClick={() => setIsAddingMeeting(false)}
                  className="text-slate-300 hover:text-slate-600 transition-colors"
                >
                  <X size={32} />
                </button>
              </div>
              <form onSubmit={handleAddMeeting} className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <input
                    name="date"
                    type="date"
                    required
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] font-bold outline-none focus:border-blue-500"
                  />
                  <select
                    name="category"
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] font-bold outline-none focus:border-blue-500"
                  >
                    <option>Zoning</option>
                    <option>Finance</option>
                    <option>Infrastructure</option>
                    <option>Public Safety</option>
                  </select>
                </div>
                <input
                  name="title"
                  placeholder="Meeting Session Title"
                  required
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] font-bold text-lg outline-none focus:border-blue-500"
                />
                <input
                  name="itemTitle"
                  placeholder="Agenda Item Name"
                  required
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] font-bold text-lg outline-none focus:border-blue-500"
                />
                <textarea
                  name="description"
                  placeholder="Short description for the public..."
                  rows="5"
                  className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] text-lg outline-none focus:border-blue-500"
                ></textarea>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-6 rounded-[32px] font-black text-xl hover:bg-blue-700 transition-all shadow-2xl"
                >
                  Save Decision
                </button>
              </form>
            </div>
          </div>
        )}

        {isAddingCommissioner && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-50 flex items-center justify-center p-8 animate-in fade-in duration-300">
            <div className="bg-white rounded-[56px] w-full max-w-md p-12 shadow-2xl">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                  Add Representative
                </h3>
                <button
                  onClick={() => setIsAddingCommissioner(false)}
                  className="text-slate-300 hover:text-slate-600 transition-colors"
                >
                  <X size={32} />
                </button>
              </div>
              <form onSubmit={handleAddCommissioner} className="space-y-6">
                <input
                  name="name"
                  placeholder="Full Official Name"
                  required
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] font-bold outline-none focus:border-blue-500"
                />
                <input
                  name="district"
                  placeholder="District Representation"
                  required
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] font-bold outline-none focus:border-blue-500"
                />
                <input
                  name="image"
                  placeholder="Photo URL"
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] font-bold outline-none focus:border-blue-500"
                />
                <input
                  name="party"
                  placeholder="Party / Affiliation"
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] font-bold outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="w-full bg-orange-500 text-white py-6 rounded-[32px] font-black text-xl hover:bg-orange-600 shadow-2xl transition-all"
                >
                  Add Commissioner
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
