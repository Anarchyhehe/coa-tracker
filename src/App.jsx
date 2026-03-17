import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  PieChart, 
  Pie, 
  Cell,
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import { 
  Plus, 
  Users, 
  CheckCircle, 
  XCircle, 
  MinusCircle,
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
  Edit2,
  Clock,
  TrendingUp,
  Activity,
  FileText
} from 'lucide-react';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDPE8NTz21mQ13hVBlJc9FA7fp8ngY9h3w",
  authDomain: "coa-commission-tracker.firebaseapp.com",
  projectId: "coa-commission-tracker",
  storageBucket: "coa-commission-tracker.firebasestorage.app",
  messagingSenderId: "754155671764",
  appId: "1:754155671764:web:6c7837fdcd4a5a13702b41",
  measurementId: "G-7PYCLGG8KH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "coa-commission-tracker";

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [commissioners, setCommissioners] = useState([]);
  const [meetings, setMeetings] = useState([]);
  
  // Modals / Editing States
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAddingMeeting, setIsAddingMeeting] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [isAddingCommissioner, setIsAddingCommissioner] = useState(false);
  const [editingCommissioner, setEditingCommissioner] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [isAddingItemToMeeting, setIsAddingItemToMeeting] = useState(null);

  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const isAdmin = user && !user.isAnonymous;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        signInAnonymously(auth).catch(err => console.error("Anon auth failed:", err));
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const commRef = collection(db, 'artifacts', appId, 'public', 'data', 'commissioners');
    const unsubscribeComm = onSnapshot(commRef, (snapshot) => {
      setCommissioners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Firestore error:", err));

    const meetRef = collection(db, 'artifacts', appId, 'public', 'data', 'meetings');
    const unsubscribeMeet = onSnapshot(meetRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMeetings(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    }, (err) => console.error("Firestore error:", err));
    return () => {
      unsubscribeComm();
      unsubscribeMeet();
    };
  }, [user]);

  // --- Auth & Actions ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(""); setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, e.target.email.value, e.target.password.value);
      setIsLoginModalOpen(false);
    } catch (err) { setLoginError("Invalid credentials."); }
    finally { setIsLoggingIn(false); }
  };

  const handleLogout = async () => { await signOut(auth); };

  const handleCommissionerSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      district: formData.get('district'),
      image: formData.get('image') || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.get('name'))}&background=random`,
      party: formData.get('party') || "Non-partisan"
    };
    if (editingCommissioner) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'commissioners', editingCommissioner.id), data);
      setEditingCommissioner(null);
    } else {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'commissioners'), data);
      setIsAddingCommissioner(false);
    }
  };

  const handleMeetingSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const meetingData = { date: formData.get('date'), title: formData.get('title') };
    if (editingMeeting) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'meetings', editingMeeting.id), meetingData);
      setEditingMeeting(null);
    } else {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'meetings'), { ...meetingData, items: [] });
      setIsAddingMeeting(false);
    }
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const meetingId = isAddingItemToMeeting || editingItem?.meetingId;
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) return;
    const newItemData = {
      id: editingItem ? editingItem.itemData.id : crypto.randomUUID(),
      title: formData.get('title'),
      category: formData.get('category'),
      description: formData.get('description'),
      status: formData.get('status'),
      votes: editingItem ? editingItem.itemData.votes : Object.fromEntries(commissioners.map(c => [c.id, "Yes"]))
    };
    let updatedItems = [...(meeting.items || [])];
    if (editingItem) updatedItems[editingItem.itemIndex] = newItemData;
    else updatedItems.push(newItemData);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'meetings', meetingId), { items: updatedItems });
    setEditingItem(null); setIsAddingItemToMeeting(null);
  };

  const updateVote = async (meetingId, itemIndex, commId, current) => {
    if (!isAdmin) return;
    const meeting = meetings.find(m => m.id === meetingId);
    const updatedItems = [...meeting.items];
    let nextVote = "Yes";
    if (current === "Yes") nextVote = "No";
    else if (current === "No") nextVote = "N/A";
    updatedItems[itemIndex].votes[commId] = nextVote;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'meetings', meetingId), { items: updatedItems });
  };

  // --- Pertinent Stats Calculation ---
  const dashboardStats = useMemo(() => {
    const allItems = meetings.flatMap(m => (m.items || []).map(i => ({ ...i, date: m.date })));
    
    // 1. Unanimity Tracking
    let unanimousCount = 0;
    allItems.forEach(item => {
      const activeVotes = Object.values(item.votes).filter(v => v !== "N/A");
      if (activeVotes.length > 0 && activeVotes.every(v => v === activeVotes[0])) {
        unanimousCount++;
      }
    });

    // 2. Category Performance
    const catMap = {};
    allItems.forEach(item => {
      if (!catMap[item.category]) catMap[item.category] = { name: item.category, Passed: 0, Failed: 0, Tabled: 0 };
      catMap[item.category][item.status]++;
    });

    // 3. Commissioner Participation
    const commPerformance = commissioners.map(comm => {
      let yes = 0, no = 0, na = 0;
      allItems.forEach(item => {
        const v = item.votes[comm.id];
        if (v === "Yes") yes++;
        else if (v === "No") no++;
        else na++;
      });
      const totalActive = yes + no;
      return {
        id: comm.id,
        name: comm.name,
        district: comm.district,
        yesRate: totalActive > 0 ? Math.round((yes / totalActive) * 100) : 0,
        participation: allItems.length > 0 ? Math.round(((allItems.length - na) / allItems.length) * 100) : 0,
        votes: { yes, no, na }
      };
    });

    return {
      totalMeetings: meetings.length,
      totalItems: allItems.length,
      passRate: allItems.length > 0 ? Math.round((allItems.filter(i => i.status === "Passed").length / allItems.length) * 100) : 0,
      unanimity: allItems.length > 0 ? Math.round((unanimousCount / allItems.length) * 100) : 0,
      categoryChart: Object.values(catMap),
      commPerformance
    };
  }, [meetings, commissioners]);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white h-screen fixed hidden md:flex flex-col p-6 shadow-2xl z-30">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-500/20"><Database size={24} /></div>
          <h1 className="font-black text-2xl tracking-tighter">CivicWatch</h1>
        </div>
        <nav className="space-y-2 flex-1">
          {[{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, { id: 'commissioners', label: 'Commissioners', icon: Users }, { id: 'meetings', label: 'Archive', icon: Calendar }].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 translate-x-1' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <tab.icon size={20} /> {tab.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto p-5 bg-slate-800/40 rounded-[28px] border border-slate-700/50">
          {isAdmin ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-orange-400 text-xs font-black uppercase tracking-widest"><Unlock size={14} /> Admin Active</div>
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-red-600 text-white rounded-xl transition-all text-xs font-bold"><LogOut size={14} /> Logout</button>
            </div>
          ) : (
            <button onClick={() => setIsLoginModalOpen(true)} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-900/40"><LogIn size={14} /> Admin Login</button>
          )}
        </div>
      </aside>

      <main className="flex-1 md:ml-64 p-6 md:p-12 lg:p-16">
        <header className="mb-14 flex flex-col md:row justify-between items-start md:items-center gap-8">
          <div>
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-2">{activeTab === 'dashboard' ? 'Insight Hub' : activeTab === 'commissioners' ? 'Representatives' : 'Archives'}</h2>
            <p className="text-slate-500 font-semibold text-lg">Public accountability for Alamogordo.</p>
          </div>
          <div className="flex gap-4">
            {isAdmin && activeTab === 'meetings' && (<button onClick={() => setIsAddingMeeting(true)} className="bg-blue-600 text-white px-6 py-3 rounded-[20px] font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"><Plus size={20} /> New Date</button>)}
            {isAdmin && activeTab === 'commissioners' && (<button onClick={() => setIsAddingCommissioner(true)} className="bg-orange-500 text-white px-6 py-3 rounded-[20px] font-black flex items-center gap-2 hover:bg-orange-600 shadow-xl shadow-orange-500/20"><Plus size={20} /> New Member</button>)}
          </div>
        </header>

        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Meetings', value: dashboardStats.totalMeetings, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Agenda Items', value: dashboardStats.totalItems, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50' },
                { label: 'Pass Rate', value: `${dashboardStats.passRate}%`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Unanimous', value: `${dashboardStats.unanimity}%`, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' }
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl`}><stat.icon size={24}/></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Category Breakdown Chart */}
              <div className="bg-white p-10 rounded-[44px] border border-slate-100 shadow-sm">
                <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2"><Filter size={20} className="text-blue-500" /> Outcome by Category</h3>
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardStats.categoryChart}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                      <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                      <Legend iconType="circle" />
                      <Bar dataKey="Passed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Tabled" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Commissioner Participation Table */}
              <div className="bg-white p-10 rounded-[44px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2"><Users size={20} className="text-blue-500" /> Voting Participation</h3>
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-50">
                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Commissioner</th>
                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Yes Rate</th>
                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {dashboardStats.commPerformance.map((comm) => (
                        <tr key={comm.id} className="group">
                          <td className="py-4">
                            <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{comm.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{comm.district}</p>
                          </td>
                          <td className="py-4">
                            <span className={`text-sm font-black ${comm.yesRate > 75 ? 'text-green-600' : 'text-slate-600'}`}>{comm.yesRate}%</span>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full max-w-[60px] overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${comm.participation}%` }}></div>
                              </div>
                              <span className="text-xs font-bold text-slate-500">{comm.participation}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {dashboardStats.commPerformance.length === 0 && (
                     <p className="py-10 text-center text-slate-300 italic text-sm">Add commissioners to see stats.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Commissioners View */}
        {activeTab === 'commissioners' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {commissioners.map(comm => (
              <div key={comm.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative group hover:shadow-2xl transition-all duration-500">
                {isAdmin && (
                  <div className="absolute top-6 right-6 flex gap-2">
                    <button onClick={() => setEditingCommissioner(comm)} className="p-2 text-slate-200 hover:text-blue-500"><Edit2 size={18}/></button>
                    <button onClick={() => { if(window.confirm("Remove member?")) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'commissioners', comm.id))}} className="p-2 text-slate-200 hover:text-red-500"><Trash2 size={18}/></button>
                  </div>
                )}
                <div className="flex flex-col items-center text-center">
                  <img src={comm.image} className="w-28 h-28 rounded-[32px] object-cover border-8 border-slate-50 mb-6 shadow-lg" alt="" />
                  <h3 className="font-black text-2xl text-slate-900 mb-1">{comm.name}</h3>
                  <p className="text-base text-slate-500 font-bold mb-4">{comm.district}</p>
                  <span className="px-4 py-1.5 bg-blue-50 text-blue-600 text-xs font-black uppercase rounded-full tracking-widest">{comm.party}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Meeting Archive View */}
        {activeTab === 'meetings' && (
          <div className="space-y-12">
            {meetings.map(meeting => (
              <div key={meeting.id} className="bg-white rounded-[56px] border border-slate-100 shadow-sm overflow-hidden mb-8">
                <div className="p-10 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <Calendar className="text-blue-600" size={24} />
                    <h3 className="font-black text-2xl text-slate-900">{meeting.title} - <span className="text-slate-400">{meeting.date}</span></h3>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-4">
                       <button onClick={() => setIsAddingItemToMeeting(meeting.id)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"><Plus size={16}/> Add Item</button>
                       <button onClick={() => setEditingMeeting(meeting)} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 size={20}/></button>
                       <button onClick={() => { if(window.confirm("Delete meeting?")) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'meetings', meeting.id))}} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={20}/></button>
                    </div>
                  )}
                </div>
                {meeting.items?.map((item, idx) => (
                  <div key={item.id} className="p-10 lg:p-14 border-b last:border-0 relative">
                    {isAdmin && (
                      <div className="absolute top-10 right-10 flex gap-2">
                         <button onClick={() => setEditingItem({ meetingId: meeting.id, itemIndex: idx, itemData: item })} className="p-2 text-slate-300 hover:text-blue-500"><Edit2 size={16}/></button>
                         <button onClick={() => { if(window.confirm("Delete item?")) {
                            const updated = meeting.items.filter((_, i) => i !== idx);
                            updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'meetings', meeting.id), { items: updated });
                         }}} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                    )}
                    <div className="flex flex-col lg:flex-row justify-between items-start mb-12 gap-10">
                      <div className="max-w-4xl">
                        <span className="text-[11px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full mb-5 inline-block">{item.category}</span>
                        <h4 className="text-3xl font-black text-slate-900 mb-5 leading-tight">{item.title}</h4>
                        <p className="text-slate-500 text-lg leading-relaxed font-medium">{item.description}</p>
                      </div>
                      <div className={`min-w-[150px] px-8 py-4 rounded-[24px] text-xs font-black uppercase tracking-[0.2em] text-center ${
                        item.status === 'Passed' ? 'bg-green-100 text-green-700' : 
                        item.status === 'Failed' ? 'bg-red-100 text-red-700' : 
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {item.status}
                      </div>
                    </div>
                    <div className="bg-slate-50/70 p-8 rounded-[40px] grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-6">
                      {commissioners.map(comm => (
                        <div key={comm.id} className="text-center group/voter">
                          <img src={comm.image} className="w-16 h-16 rounded-[20px] mx-auto object-cover border-4 border-white shadow-xl mb-3 transition-all group-hover/voter:scale-110" alt="" />
                          <p className="text-xs font-black text-slate-700 truncate mb-3">{comm.name.split(' ').pop()}</p>
                          {isAdmin ? (
                            <button 
                              onClick={() => updateVote(meeting.id, idx, comm.id, item.votes[comm.id])} 
                              className={`text-[10px] font-black px-4 py-1.5 rounded-xl text-white shadow-md active:scale-90 ${
                                item.votes[comm.id] === 'Yes' ? 'bg-green-600' : 
                                item.votes[comm.id] === 'No' ? 'bg-red-600' : 'bg-slate-400'
                              }`}
                            >
                              {item.votes[comm.id] || "N/A"}
                            </button>
                          ) : (
                            <div className={`text-[10px] font-black flex items-center justify-center gap-1 ${
                              item.votes[comm.id] === 'Yes' ? 'text-green-600' : 
                              item.votes[comm.id] === 'No' ? 'text-red-600' : 'text-slate-400 italic'
                            }`}>
                              {item.votes[comm.id] === 'Yes' ? <CheckCircle size={12}/> : 
                               item.votes[comm.id] === 'No' ? <XCircle size={12}/> : <Clock size={12}/>} 
                              {item.votes[comm.id] || "N/A"}
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

        {/* --- MODALS --- */}

        {(isAddingMeeting || editingMeeting) && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-50 flex items-center justify-center p-8 animate-in fade-in">
            <div className="bg-white rounded-[56px] w-full max-w-2xl p-12 shadow-2xl">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{editingMeeting ? "Edit Meeting Details" : "New Meeting Date"}</h3>
                <button onClick={() => {setIsAddingMeeting(false); setEditingMeeting(null);}} className="text-slate-300 hover:text-slate-600"><X size={32}/></button>
              </div>
              <form onSubmit={handleMeetingSubmit} className="space-y-8">
                <input name="date" type="date" required defaultValue={editingMeeting?.date} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] font-bold outline-none" />
                <input name="title" placeholder="Meeting Title (e.g. Regular Session)" required defaultValue={editingMeeting?.title} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] font-bold text-lg outline-none" />
                <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[32px] font-black text-xl shadow-2xl">{editingMeeting ? "Update Meeting" : "Create Date"}</button>
              </form>
            </div>
          </div>
        )}

        {(isAddingItemToMeeting || editingItem) && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[60] flex items-center justify-center p-8 animate-in fade-in">
            <div className="bg-white rounded-[56px] w-full max-w-2xl p-12 shadow-2xl">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{editingItem ? "Edit Agenda Item" : "Add Agenda Item"}</h3>
                <button onClick={() => {setIsAddingItemToMeeting(null); setEditingItem(null);}} className="text-slate-300 hover:text-slate-600"><X size={32}/></button>
              </div>
              <form onSubmit={handleItemSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                     <input name="category" placeholder="e.g. Finance" defaultValue={editingItem?.itemData.category} required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                     <select name="status" defaultValue={editingItem?.itemData.status || "Passed"} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none">
                       <option value="Passed">Passed</option>
                       <option value="Failed">Failed</option>
                       <option value="Tabled">Tabled</option>
                     </select>
                   </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Name</label>
                  <input name="title" placeholder="Agenda Title" required defaultValue={editingItem?.itemData.title} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-lg outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                  <textarea name="description" placeholder="Public summary..." rows="4" defaultValue={editingItem?.itemData.description} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-3xl text-lg outline-none"></textarea>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[28px] font-black text-xl shadow-2xl">Save Item</button>
              </form>
            </div>
          </div>
        )}

        {(isAddingCommissioner || editingCommissioner) && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-50 flex items-center justify-center p-8 animate-in fade-in">
            <div className="bg-white rounded-[56px] w-full max-w-md p-12 shadow-2xl">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{editingCommissioner ? "Edit Member" : "New Member"}</h3>
                <button onClick={() => {setIsAddingCommissioner(false); setEditingCommissioner(null);}} className="text-slate-300 hover:text-slate-600"><X size={32}/></button>
              </div>
              <form onSubmit={handleCommissionerSubmit} className="space-y-6">
                <input name="name" placeholder="Full Name" required defaultValue={editingCommissioner?.name} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] font-bold outline-none" />
                <input name="district" placeholder="District" required defaultValue={editingCommissioner?.district} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] font-bold outline-none" />
                <input name="image" placeholder="Photo URL" defaultValue={editingCommissioner?.image} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] font-bold outline-none" />
                <input name="party" placeholder="Affiliation" defaultValue={editingCommissioner?.party} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] font-bold outline-none" />
                <button type="submit" className="w-full bg-orange-500 text-white py-6 rounded-[32px] font-black text-xl shadow-2xl">Save Member</button>
              </form>
            </div>
          </div>
        )}

        {isLoginModalOpen && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[48px] w-full max-w-md p-12 shadow-2xl relative">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Admin Portal</h3>
                <button onClick={() => setIsLoginModalOpen(false)} className="text-slate-300 hover:text-slate-600"><X size={32}/></button>
              </div>
              {loginError && (<div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold"><AlertCircle size={20} /> {loginError}</div>)}
              <form onSubmit={handleLogin} className="space-y-6">
                <input name="email" type="email" required placeholder="Email" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold" />
                <input name="password" type="password" required placeholder="Password" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold" />
                <button type="submit" disabled={isLoggingIn} className="w-full bg-slate-900 text-white py-6 rounded-[28px] font-black text-lg disabled:opacity-50">{isLoggingIn ? "Signing In..." : "Log In"}</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}