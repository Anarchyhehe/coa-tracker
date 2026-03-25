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
import { getAnalytics, logEvent } from 'firebase/analytics';
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
  FileText,
  Award,
  CalendarDays,
  Youtube,
  ExternalLink,
  History,
  ShieldCheck,
  UserX,
  Info,
  CircleSlash,
  ChevronDown,
  ChevronUp,
  MapPin,
  Github,
  Mail,
  ShieldAlert,
  Code,
  MessagesSquare,
  Construction,
  Moon,
  Sun,
  Ban,
  UserMinus
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
const analytics = getAnalytics(app);
const appId = "coa-commission-tracker";

// Helper for date formatting
const formatDate = (dateStr) => {
  if (!dateStr) return "TBD";
  const [year, month, day] = dateStr.split('-');
  return `${month}/${day}/${year}`;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [commissioners, setCommissioners] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [expandedMeetings, setExpandedMeetings] = useState([]);
  
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

  // Track page views on tab changes
  useEffect(() => {
    if (analytics) {
      logEvent(analytics, 'page_view', {
        page_title: activeTab,
        page_location: window.location.href,
        page_path: `/${activeTab}`
      });
    }
  }, [activeTab]);

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
      const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setMeetings(sorted);
      if (sorted.length > 0 && expandedMeetings.length === 0) {
        setExpandedMeetings([sorted[0].id]);
      }
    }, (err) => console.error("Firestore error:", err));
    return () => {
      unsubscribeComm();
      unsubscribeMeet();
    };
  }, [user]);

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
      role: formData.get('role'),
      isActive: formData.get('isActive') === 'on',
      image: formData.get('image') || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.get('name'))}&background=random`,
      party: formData.get('party') || "Non-partisan",
      assumedOffice: formData.get('assumedOffice'),
      termExpires: formData.get('termExpires'),
      currentTerm: formData.get('currentTerm')
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
    const activeIds = commissioners.filter(c => formData.get(`active-${c.id}`)).map(c => c.id);
    
    const meetingData = { 
      date: formData.get('date'), 
      title: formData.get('title'),
      youtubeUrl: formData.get('youtubeUrl'),
      activeCommissionerIds: activeIds
    };

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

    const rosterIds = meeting.activeCommissionerIds || commissioners.map(c => c.id);

    const newItemData = {
      id: editingItem ? editingItem.itemData.id : crypto.randomUUID(),
      title: formData.get('title'),
      category: formData.get('category'),
      description: formData.get('description'),
      status: formData.get('status'),
      timestampUrl: formData.get('timestampUrl'),
      votes: editingItem ? editingItem.itemData.votes : Object.fromEntries(rosterIds.map(id => [id, "Yes"]))
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
    
    // Cycle: Yes -> No -> Absent -> Abstain -> Recused
    let nextVote = "Yes";
    if (current === "Yes") nextVote = "No";
    else if (current === "No") nextVote = "Absent";
    else if (current === "Absent") nextVote = "Abstain";
    else if (current === "Abstain") nextVote = "Recused";

    updatedItems[itemIndex].votes[commId] = nextVote;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'meetings', meetingId), { items: updatedItems });
  };

  const toggleMeetingCollapse = (id) => {
    setExpandedMeetings(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const dashboardStats = useMemo(() => {
    const allItems = meetings.flatMap(m => (m.items || []).map(i => ({ 
      ...i, 
      meetingId: m.id,
      date: m.date, 
      activeVoterIds: m.activeCommissionerIds || [] 
    })));
    
    let unanimousCount = 0;
    const votingItems = allItems.filter(i => i.status !== "Upcoming" && i.status !== "N/A (No Vote Required)");

    votingItems.forEach(item => {
      const activeVotes = Object.entries(item.votes)
        .filter(([id]) => item.activeVoterIds.includes(id))
        .map(([_, v]) => v)
        .filter(v => v !== "Abstain" && v !== "Absent" && v !== "Recused" && v !== "N/A");

      if (activeVotes.length > 0 && activeVotes.every(v => v === activeVotes[0])) {
        unanimousCount++;
      }
    });

    const catMap = {};
    allItems.forEach(item => {
      if (!catMap[item.category]) catMap[item.category] = { name: item.category, Passed: 0, Failed: 0, Tabled: 0, Upcoming: 0, "N/A": 0 };
      const key = (item.status === "N/A (No Vote Required)" || item.status === "Abstain") ? "N/A" : item.status;
      catMap[item.category][key]++;
    });

    const commPerformance = commissioners.map(comm => {
      let yes = 0, no = 0, abstain = 0, absentVotes = 0, recused = 0;
      
      // Track meeting attendance (one absence per meeting max)
      let meetingsAssigned = 0;
      let meetingsAbsent = 0;

      meetings.forEach(meeting => {
        const assigned = (meeting.activeCommissionerIds || []).includes(comm.id);
        if (assigned) {
          meetingsAssigned++;
          const items = meeting.items || [];
          // If they are marked absent for ANY item in this meeting, they are absent for the meeting
          const wasAbsent = items.some(item => item.votes[comm.id] === "Absent");
          if (wasAbsent) meetingsAbsent++;
          
          // Still count the specific vote types for the breakdown
          items.forEach(item => {
            const v = item.votes[comm.id];
            if (v === "Yes") yes++;
            else if (v === "No") no++;
            else if (v === "Abstain") abstain++;
            else if (v === "Recused") recused++;
            else if (v === "Absent") absentVotes++;
          });
        }
      });

      const totalActiveVotes = yes + no;
      const participation = meetingsAssigned > 0 ? Math.round(((meetingsAssigned - meetingsAbsent) / meetingsAssigned) * 100) : 0;
      const yesRate = totalActiveVotes > 0 ? Math.round((yes / totalActiveVotes) * 100) : 0;

      return {
        id: comm.id,
        name: comm.name,
        district: comm.district,
        isActive: comm.isActive,
        yesRate,
        participation,
        votes: { yes, no, abstain, absentVotes, recused }
      };
    });

    return {
      totalMeetings: meetings.length,
      totalItems: allItems.length,
      passRate: votingItems.length > 0 ? Math.round((votingItems.filter(i => i.status === "Passed").length / votingItems.length) * 100) : 0,
      unanimity: votingItems.length > 0 ? Math.round((unanimousCount / votingItems.length) * 100) : 0,
      categoryChart: Object.values(catMap),
      commPerformance
    };
  }, [meetings, commissioners]);

  const activeComms = commissioners.filter(c => c.isActive !== false);
  const inactiveComms = commissioners.filter(c => c.isActive === false);

  return (
    <div className={`min-h-screen flex font-sans transition-colors duration-500 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <aside className="w-64 bg-slate-900 text-white h-screen fixed hidden md:flex flex-col p-6 shadow-2xl z-30">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-500/20"><Database size={24} /></div>
          <h1 className="font-black text-2xl tracking-tighter">CivicWatch</h1>
        </div>
        <nav className="space-y-2 flex-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, 
            { id: 'commissioners', label: 'Commissioners', icon: Users }, 
            { id: 'meetings', label: 'Archive', icon: Calendar },
            { id: 'about', label: 'About', icon: Info }
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 translate-x-1' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <tab.icon size={20} /> {tab.label}
            </button>
          ))}
        </nav>
        
        <div className="mt-auto space-y-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-800/40 rounded-2xl border border-slate-700/50 text-slate-400 hover:text-white transition-all group"
          >
            <div className="flex items-center gap-3">
              {isDarkMode ? <Sun size={20} className="text-orange-400" /> : <Moon size={20} className="text-blue-400" />}
              <span className="text-xs font-black uppercase tracking-widest">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${isDarkMode ? 'bg-orange-400/20' : 'bg-blue-400/20'}`}>
               <div className={`absolute top-1 w-2 h-2 rounded-full transition-all ${isDarkMode ? 'right-1 bg-orange-400' : 'left-1 bg-blue-400'}`}></div>
            </div>
          </button>

          <div className="p-5 bg-slate-800/40 rounded-[28px] border border-slate-700/50">
            {isAdmin ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-orange-400 text-xs font-black uppercase tracking-widest"><Unlock size={14} /> Admin Active</div>
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-red-600 text-white rounded-xl transition-all text-xs font-bold"><LogOut size={14} /> Logout</button>
              </div>
            ) : (
              <button onClick={() => setIsLoginModalOpen(true)} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-900/40"><LogIn size={14} /> Admin Login</button>
            )}
          </div>
        </div>
      </aside>

      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t flex justify-around items-center p-3 z-40 pb-safe shadow-lg transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'commissioners', label: 'Members', icon: Users },
          { id: 'meetings', label: 'Archive', icon: Calendar },
          { id: 'about', label: 'About', icon: Info },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'}`}>
            <tab.icon size={20} />
            <span className="text-[10px] font-black uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
        <button onClick={() => setIsDarkMode(!isDarkMode)} className={`flex flex-col items-center gap-1 transition-colors ${isDarkMode ? 'text-orange-400' : 'text-blue-600'}`}>
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          <span className="text-[10px] font-black uppercase tracking-tighter">Theme</span>
        </button>
      </nav>

      <main className="flex-1 md:ml-64 p-6 md:p-12 lg:p-16 pb-32 md:pb-12">
        <header className="mb-14 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex flex-col">
            <h2 className={`text-4xl lg:text-5xl font-black tracking-tight mb-2 uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {activeTab === 'dashboard' ? 'Insight Hub' : activeTab === 'commissioners' ? 'Representatives' : activeTab === 'about' ? 'Transparency' : 'Archives'}
            </h2>
            <p className="text-slate-500 font-semibold text-lg">Public accountability for Alamogordo.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {isAdmin && activeTab === 'meetings' && (<button onClick={() => setIsAddingMeeting(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all text-sm"><Plus size={18} /> New Date</button>)}
            {isAdmin && activeTab === 'commissioners' && (<button onClick={() => setIsAddingCommissioner(true)} className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-black flex items-center gap-2 hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all text-sm"><Plus size={18} /> New Member</button>)}
            <div className="md:hidden">{isAdmin ? (<button onClick={handleLogout} className="bg-slate-800 text-white px-4 py-2.5 rounded-xl font-black flex items-center gap-2 text-sm"><LogOut size={16} /> Logout</button>) : (<button onClick={() => setIsLoginModalOpen(true)} className="bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-black flex items-center gap-2 text-sm"><LogIn size={16} /> Admin Login</button>)}</div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Meetings', value: dashboardStats.totalMeetings, icon: Calendar, color: 'text-blue-600', bg: isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50' },
                { label: 'Agenda Items', value: dashboardStats.totalItems, icon: FileText, color: 'text-orange-600', bg: isDarkMode ? 'bg-orange-900/20' : 'bg-orange-50' },
                { label: 'Pass Rate', value: `${dashboardStats.passRate}%`, icon: TrendingUp, color: 'text-green-600', bg: isDarkMode ? 'bg-green-900/20' : 'bg-green-50' },
                { label: 'Unanimous', value: `${dashboardStats.unanimity}%`, icon: Activity, color: 'text-purple-600', bg: isDarkMode ? 'bg-purple-900/20' : 'bg-purple-50' }
              ].map((stat, i) => (
                <div key={i} className={`p-6 rounded-[32px] border shadow-sm flex items-center gap-4 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl`}><stat.icon size={24}/></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className={`p-6 md:p-10 rounded-[44px] border shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <h3 className={`text-xl font-black mb-8 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}><Filter size={20} className="text-blue-500" /> Outcome by Category</h3>
                <div className="h-[300px] md:h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardStats.categoryChart}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#334155" : "#f1f5f9"} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                      <Tooltip contentStyle={{ borderRadius: '20px', backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="Passed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Tabled" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="N/A" fill={isDarkMode ? "#475569" : "#cbd5e1"} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Upcoming" fill={isDarkMode ? "#334155" : "#94a3b8"} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className={`p-6 md:p-10 rounded-[44px] border shadow-sm overflow-hidden flex flex-col transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <h3 className={`text-xl font-black mb-8 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}><Users size={20} className="text-blue-500" /> Bench Participation</h3>
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[300px]">
                    <thead>
                      <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Yes Rate</th>
                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Attendance</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-50'}`}>
                      {dashboardStats.commPerformance.map((comm) => (
                        <tr key={comm.id} className={`group transition-colors ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/50'}`}>
                          <td className="py-4 flex items-center gap-2">
                             <div>
                               <p className={`font-bold transition-colors ${comm.isActive ? (isDarkMode ? 'text-slate-200' : 'text-slate-900') : 'text-slate-400 italic'} ${comm.isActive && 'group-hover:text-blue-500'}`}>{comm.name}</p>
                               <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{comm.district} {!comm.isActive && ' (FORMER)'}</p>
                             </div>
                          </td>
                          <td className="py-4 text-center">
                            <span className={`font-black ${comm.yesRate > 75 ? 'text-green-600' : 'text-slate-600'}`}>{comm.yesRate}%</span>
                          </td>
                          <td className="py-4 text-right">
                             <span className={`text-xs font-black ${comm.participation < 100 ? 'text-red-500' : 'text-slate-500'}`}>
                               {comm.participation}%
                             </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'commissioners' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <section>
              <div className="flex items-center gap-3 mb-8">
                <ShieldCheck className="text-blue-600" size={24} />
                <h3 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Current Commission</h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {activeComms.map(comm => (
                  <div key={comm.id} className={`p-8 rounded-[40px] border shadow-sm relative group hover:shadow-2xl transition-all duration-500 overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-[100px] -mr-10 -mt-10 transition-all ${isDarkMode ? 'bg-slate-800/50 group-hover:bg-slate-800' : 'bg-blue-50/50 group-hover:bg-blue-100/50'}`}></div>
                    {isAdmin && (
                      <div className="absolute top-6 right-6 flex gap-2 z-10">
                        <button onClick={() => setEditingCommissioner(comm)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors"><Edit2 size={18}/></button>
                        <button onClick={() => { if(window.confirm("Remove member?")) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'commissioners', comm.id))}} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 relative z-0">
                      <img src={comm.image} className={`w-32 h-32 rounded-[32px] object-cover border-8 shadow-xl transition-colors ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`} alt="" />
                      <div className="flex-1 text-center sm:text-left">
                        <div className="mb-4">
                          <h3 className={`font-black text-2xl mb-1 leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{comm.name}</h3>
                          <p className="text-blue-600 font-bold uppercase text-sm tracking-widest">{comm.role || "Commissioner"}</p>
                          <div className="flex items-center gap-1.5 justify-center sm:justify-start mt-1">
                             <MapPin size={12} className="text-slate-400" />
                             <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{comm.district}</span>
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase mt-2 block">{comm.party}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                            <Award size={16} className="text-orange-500" />
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Current Term</p>
                              <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{comm.currentTerm || "Not Set"}</p>
                            </div>
                          </div>
                          <div className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                            <CalendarDays size={16} className="text-blue-500" />
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Assumed Office</p>
                              <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{formatDate(comm.assumedOffice)}</p>
                            </div>
                          </div>
                        </div>
                        <div className={`mt-4 p-3 rounded-2xl flex justify-between items-center px-5 transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-900 text-white'}`}>
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Term Expires</p>
                           <p className="text-xs font-bold">{formatDate(comm.termExpires)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            {inactiveComms.length > 0 && (
              <section className={`pt-8 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-3 mb-8">
                  <History className="text-slate-400" size={24} />
                  <h3 className="text-2xl font-black text-slate-500 tracking-tight">Historical Members</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inactiveComms.map(comm => (
                    <div key={comm.id} className={`p-6 rounded-[32px] border shadow-sm relative group opacity-75 hover:opacity-100 transition-all overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                      {isAdmin && (
                        <div className="absolute top-4 right-4 flex gap-1 z-10">
                          <button onClick={() => setEditingCommissioner(comm)} className="p-2 text-slate-200 hover:text-blue-500 transition-colors"><Edit2 size={14}/></button>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mb-4">
                        <img src={comm.image} className="w-16 h-16 rounded-2xl object-cover grayscale" alt="" />
                        <div>
                          <h4 className={`font-bold leading-tight ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{comm.name}</h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{comm.role || comm.district}</p>
                          <div className="flex items-center gap-1 mt-1">
                             <MapPin size={10} className="text-slate-300" />
                             <span className="text-[10px] text-slate-400 font-bold uppercase">{comm.district}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`space-y-1 pt-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                         <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                            <span>Assumed Office</span>
                            <span className={isDarkMode ? 'text-slate-500' : 'text-slate-600'}>{formatDate(comm.assumedOffice)}</span>
                         </div>
                         <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                            <span>Term Ended</span>
                            <span className={isDarkMode ? 'text-slate-500' : 'text-slate-600'}>{formatDate(comm.termExpires)}</span>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'meetings' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {meetings.map(meeting => {
              const isExpanded = expandedMeetings.includes(meeting.id);
              return (
                <div key={meeting.id} className={`rounded-[44px] border transition-all duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} ${isExpanded ? (isDarkMode ? 'border-blue-900/40 shadow-2xl' : 'border-blue-100 shadow-xl') : 'shadow-sm hover:border-slate-400/20'}`}>
                  <div 
                    onClick={() => toggleMeetingCollapse(meeting.id)}
                    className={`p-8 md:p-12 cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-6 select-none ${isExpanded ? (isDarkMode ? 'bg-slate-800/20 rounded-t-[44px] border-b border-slate-800' : 'bg-slate-50/50 rounded-t-[44px] border-b border-slate-100') : 'rounded-[44px]'}`}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`p-5 rounded-3xl transition-colors ${isExpanded ? 'bg-blue-600 text-white' : (isDarkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400')}`}>
                        <Calendar size={32} />
                      </div>
                      <div>
                        <div className="flex items-center gap-4">
                          <h3 className={`font-black text-3xl leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{meeting.title}</h3>
                          {meeting.youtubeUrl && (
                            <a href={meeting.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700 transition-colors" onClick={(e) => e.stopPropagation()} title="Watch Meeting on YouTube">
                              <Youtube size={32} />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-3">
                           <p className="text-lg font-black text-blue-600 uppercase tracking-widest">{formatDate(meeting.date)}</p>
                           <span className="text-slate-300 text-xl">•</span>
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{meeting.items?.length || 0} Agenda Items</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 ml-auto md:ml-0">
                      {isAdmin && (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                           <button onClick={() => setIsAddingItemToMeeting(meeting.id)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-transform hover:scale-105"><Plus size={16}/> Add Item</button>
                           <button onClick={() => setEditingMeeting(meeting)} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 size={20}/></button>
                           <button onClick={() => { if(window.confirm("Delete meeting?")) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'meetings', meeting.id))}} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={20}/></button>
                        </div>
                      )}
                      <div className="p-2 text-slate-300">
                         {isExpanded ? <ChevronUp size={32} /> : <ChevronDown size={32} />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      {meeting.items?.length === 0 ? (
                        <div className="p-14 text-center text-slate-400 italic font-medium">No agenda items logged for this session.</div>
                      ) : (
                        meeting.items?.map((item, idx) => {
                          const activeIds = meeting.activeCommissionerIds || commissioners.filter(c => c.isActive !== false).map(c => c.id);
                          const activeComms = commissioners.filter(c => activeIds.includes(c.id));
                          const isNoVoteItem = item.status === "N/A (No Vote Required)";

                          return (
                            <div key={item.id} className={`p-6 md:p-14 border-b last:border-0 relative ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                              {isAdmin && (
                                <div className="absolute top-6 md:top-10 right-6 md:right-10 flex gap-2">
                                   <button onClick={() => setEditingItem({ meetingId: meeting.id, itemIndex: idx, itemData: item })} className="p-2 text-slate-300 hover:text-blue-500"><Edit2 size={16}/></button>
                                   <button onClick={() => { if(window.confirm("Delete item?")) { const updated = meeting.items.filter((_, i) => i !== idx); updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'meetings', meeting.id), { items: updated }); }}} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                              )}
                              <div className="flex flex-col lg:flex-row justify-between items-start mb-12 gap-10">
                                <div className="max-w-4xl">
                                  <div className="flex items-center gap-3 mb-5">
                                    <span className={`text-[11px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full inline-block ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>{item.category}</span>
                                    {item.timestampUrl && (
                                      <a href={item.timestampUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full transition-transform hover:scale-105 ${isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'}`}>
                                        <Youtube size={14} /> Watch Segment
                                      </a>
                                    )}
                                  </div>
                                  <h4 className={`text-2xl md:text-3xl font-black mb-5 leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</h4>
                                  <p className={`text-base md:text-lg leading-relaxed font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.description}</p>
                                </div>
                                <div className={`min-w-[150px] w-full md:w-auto px-8 py-4 rounded-[24px] text-xs font-black uppercase tracking-[0.2em] text-center flex items-center justify-center gap-2 ${
                                  item.status === 'Passed' ? (isDarkMode ? 'bg-green-900/20 text-green-500' : 'bg-green-100 text-green-700') : 
                                  item.status === 'Failed' ? (isDarkMode ? 'bg-red-900/20 text-red-500' : 'bg-red-100 text-red-700') : 
                                  item.status === 'Upcoming' ? (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700') :
                                  item.status === 'N/A (No Vote Required)' ? (isDarkMode ? 'bg-slate-800/40 text-slate-600' : 'bg-slate-100 text-slate-500') :
                                  (isDarkMode ? 'bg-amber-900/20 text-amber-500' : 'bg-amber-100 text-amber-700')
                                }`}>
                                  {item.status === 'Upcoming' && <Clock size={14} />}
                                  {item.status === 'N/A (No Vote Required)' && <CircleSlash size={14} />}
                                  {item.status}
                                </div>
                              </div>
                              
                              {item.status === 'Upcoming' ? (
                                <div className={`p-8 rounded-[40px] border border-dashed text-center ${isDarkMode ? 'bg-slate-950/50 border-slate-800 text-blue-400/80' : 'bg-blue-50/50 border-blue-200 text-blue-600'}`}>
                                  <p className="font-bold text-sm">Meeting Pending. Voting records will be updated once the session concludes.</p>
                                </div>
                              ) : isNoVoteItem ? (
                                <div className={`p-8 rounded-[40px] border border-dashed text-center flex flex-col items-center ${isDarkMode ? 'bg-slate-950/50 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                   <Info size={24} className="text-slate-500 mb-3" />
                                   <p className="font-bold text-sm">Discussion or Procedural Item. No voting action was required for this agenda entry.</p>
                                </div>
                              ) : (
                                <div className={`p-6 md:p-8 rounded-[32px] md:rounded-[40px] grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-6 transition-colors ${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/70'}`}>
                                  {activeComms.map(comm => {
                                    const vote = item.votes[comm.id] || "Abstain";
                                    return (
                                      <div key={comm.id} className="text-center group/voter">
                                        <img src={comm.image} className={`w-12 h-12 md:w-16 md:h-16 rounded-[16px] md:rounded-[20px] mx-auto object-cover border-4 shadow-xl mb-3 transition-all group-hover/voter:scale-110 ${isDarkMode ? 'border-slate-800 shadow-slate-950/40' : 'border-white shadow-slate-200'}`} alt="" />
                                        <p className={`text-[10px] md:text-xs font-black truncate px-2 mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>{comm.name.split(' ').pop()}</p>
                                        {isAdmin ? (
                                          <button onClick={() => updateVote(meeting.id, idx, comm.id, vote)} className={`text-[10px] font-black px-4 py-1.5 rounded-xl text-white shadow-md active:scale-90 w-full transition-colors ${
                                            vote === 'Yes' ? 'bg-green-600' : 
                                            vote === 'No' ? 'bg-red-600' : 
                                            vote === 'Absent' ? 'bg-purple-600' : 
                                            vote === 'Recused' ? 'bg-orange-600' :
                                            'bg-slate-400'
                                          }`}>{vote}</button>
                                        ) : (
                                          <div className={`text-[10px] font-black flex items-center justify-center gap-1 transition-colors ${
                                            vote === 'Yes' ? 'text-green-500' : 
                                            vote === 'No' ? 'text-red-500' : 
                                            vote === 'Absent' ? 'text-purple-500' : 
                                            vote === 'Recused' ? 'text-orange-500' :
                                            'text-slate-500 italic'
                                          }`}>
                                            {vote === 'Yes' ? <CheckCircle size={12}/> : 
                                             vote === 'No' ? <XCircle size={12}/> : 
                                             vote === 'Absent' ? <UserMinus size={12}/> : 
                                             vote === 'Recused' ? <Ban size={12}/> :
                                             <Clock size={12}/>} 
                                            {vote}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="max-w-4xl space-y-10 animate-in fade-in duration-500">
            {/* WIP Section */}
            <div className={`p-10 rounded-[44px] shadow-xl relative overflow-hidden group transition-colors ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-slate-900 text-white'}`}>
              <div className="absolute top-0 right-0 p-8 text-slate-800 transition-transform group-hover:scale-110"><Construction size={120} /></div>
              <div className="relative z-10">
                <h3 className="text-2xl font-black mb-6 flex items-center gap-3 text-orange-400"><Construction /> Work in Progress</h3>
                <div className="space-y-4 text-slate-300 text-lg leading-relaxed font-medium">
                  <p>
                    Please note that CivicWatch is currently <span className="text-white font-bold italic">under active development.</span> This is not an exhaustive archive of all City of Alamogordo commission meetings.
                  </p>
                  <p>
                    As a solo project, each meeting entry is manually researched and documented during off-work hours. I am currently working through a backlog of historical meetings to provide a more complete picture of our city's legislative history.
                  </p>
                </div>
              </div>
            </div>

            {/* Disclaimer Section */}
            <div className={`p-10 rounded-[44px] border shadow-sm relative overflow-hidden transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-orange-100'}`}>
              <div className={`absolute top-0 right-0 p-8 transition-colors ${isDarkMode ? 'text-slate-800' : 'text-orange-50'}`}><ShieldAlert size={120} /></div>
              <div className="relative z-10">
                <h3 className="text-2xl font-black mb-6 flex items-center gap-3 text-orange-500"><ShieldAlert /> Content Disclaimer</h3>
                <div className={`space-y-4 text-lg leading-relaxed font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  <p>
                    CivicWatch is a <span className={`font-bold italic underline decoration-orange-300 text-decoration-thickness-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>personal passion project</span> created and maintained by Sven Sears. 
                  </p>
                  <p>
                    Although the creator is an employee of the City of Alamogordo, this platform is <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>not managed, funded, or endorsed by the City of Alamogordo.</span> 
                  </p>
                  <p>
                    All data and records shown here are compiled from publicly available sources, including official city meeting recordings and published agenda packets. For official, legally binding records, please visit the City Clerk's office.
                  </p>
                </div>
              </div>
            </div>

            {/* Methodology & Curation Section */}
            <div className={`p-10 rounded-[44px] border shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-50'}`}>
              <h3 className={`text-2xl font-black mb-6 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}><FileText className="text-blue-500" /> Curation & Methodology</h3>
              <div className={`space-y-4 text-lg leading-relaxed font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <p>
                  The goal of this tracker is to highlight high impact decisions regarding city policy, financial contracts, and community infrastructure. 
                </p>
                <p>
                  To keep the Insight Hub focused on substantive data, <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>purely procedural items</span> (such as the approval of meeting minutes, invocation, or adjournment) are generally excluded from this tracker. 
                </p>
              </div>
            </div>

            {/* Open Source & Contact Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className={`p-10 rounded-[44px] border shadow-sm relative overflow-hidden group transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <div className={`absolute -bottom-6 -right-6 transition-colors ${isDarkMode ? 'text-slate-800' : 'text-slate-50'}`}><Github size={140} /></div>
                  <div className="relative z-10">
                    <h3 className={`text-2xl font-black mb-4 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}><Code className="text-blue-500" /> Open Source</h3>
                    <p className={`mb-8 font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                      CivicWatch is built in support of a free internet. The code is available for any resident in any city to use for their own community.
                    </p>
                    <a href="https://github.com/Anarchyhehe/coa-tracker" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black transition-all shadow-lg shadow-blue-900/40">
                      <Github size={20} /> Report via GitHub
                    </a>
                  </div>
               </div>

               <div className={`p-10 rounded-[44px] border shadow-sm flex flex-col justify-between transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <div>
                    <h3 className={`text-2xl font-black mb-4 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}><MessagesSquare className="text-orange-500" /> Get in Touch</h3>
                    <p className={`font-medium mb-6 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                      For questions regarding data accuracy, suggestions for new categories, or collaboration requests.
                    </p>
                  </div>
                  <a href="mailto:alamogordocivicwatch@gmail.com" className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-3xl font-black transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}>
                    <Mail size={20} /> alamogordocivicwatch@gmail.com
                  </a>
               </div>
            </div>
          </div>
        )}

        {/* --- MODALS --- */}

        {(isAddingMeeting || editingMeeting) && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
            <div className={`rounded-[32px] md:rounded-[56px] w-full max-w-2xl p-6 md:p-12 shadow-2xl max-h-[90vh] overflow-y-auto transition-colors ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-10"><h3 className={`text-2xl md:text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{editingMeeting ? "Configure Session Bench" : "New Meeting Date"}</h3><button onClick={() => {setIsAddingMeeting(false); setEditingMeeting(null);}} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={32}/></button></div>
              <form onSubmit={handleMeetingSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Meeting</label><input name="date" type="date" required defaultValue={editingMeeting?.date} className={`w-full p-5 border-2 rounded-[28px] outline-none transition-all font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 focus:border-blue-600 text-white' : 'bg-slate-50 border-slate-100 focus:border-blue-500'}`} /></div>
                  <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Title</label><input name="title" placeholder="e.g. Special Meeting" required defaultValue={editingMeeting?.title} className={`w-full p-5 border-2 rounded-[28px] outline-none transition-all font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 focus:border-blue-600 text-white' : 'bg-slate-50 border-slate-100 focus:border-blue-500'}`} /></div>
                </div>
                <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">YouTube Recording URL</label><input name="youtubeUrl" placeholder="https://..." defaultValue={editingMeeting?.youtubeUrl} className={`w-full p-5 border-2 rounded-[28px] outline-none transition-all font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 focus:border-blue-600 text-white' : 'bg-slate-50 border-slate-100 focus:border-blue-500'}`} /></div>
                <div className={`p-6 md:p-8 rounded-[32px] border transition-colors ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Bench Selection (Who was seated?)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {commissioners.sort((a,b) => (b.isActive?1:0) - (a.isActive?1:0)).map(comm => {
                      const isActive = editingMeeting?.activeCommissionerIds?.includes(comm.id) ?? comm.isActive;
                      return (<label key={comm.id} className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer hover:border-blue-500 transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}><input type="checkbox" name={`active-${comm.id}`} defaultChecked={isActive} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /><div className="flex items-center gap-2"><img src={comm.image} className={`w-8 h-8 rounded-full object-cover ${!comm.isActive && 'grayscale'}`} alt="" /><div><p className={`text-xs font-bold ${!comm.isActive ? 'text-slate-400 italic' : (isDarkMode ? 'text-slate-200' : 'text-slate-900')}`}>{comm.name}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{comm.district} {!comm.isActive && '(PAST)'}</p></div></div></label>);
                    })}
                  </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-5 md:py-6 rounded-[24px] md:rounded-[32px] font-black text-lg md:text-xl shadow-2xl transition-transform active:scale-95">Save Session Configuration</button>
              </form>
            </div>
          </div>
        )}

        {(isAddingItemToMeeting || editingItem) && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[110] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
            <div className={`rounded-[32px] md:rounded-[56px] w-full max-w-2xl p-6 md:p-12 shadow-2xl max-h-[90vh] overflow-y-auto transition-colors ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-10"><h3 className={`text-2xl md:text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{editingItem ? "Edit Agenda Item" : "Add Agenda Item"}</h3><button onClick={() => {setIsAddingItemToMeeting(null); setEditingItem(null);}} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={32}/></button></div>
              <form onSubmit={handleItemSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label><input name="category" placeholder="e.g. Finance" defaultValue={editingItem?.itemData.category} required className={`w-full p-4 border-2 rounded-2xl font-bold outline-none transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800 focus:border-blue-600 text-white' : 'bg-slate-50 border-slate-100 focus:border-blue-500'}`} /></div>
                   <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Outcome</label><select name="status" defaultValue={editingItem?.itemData.status || "Upcoming"} className={`w-full p-4 border-2 rounded-2xl font-bold outline-none transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-100'}`}><option value="Upcoming">Upcoming</option><option value="Passed">Passed</option><option value="Failed">Failed</option><option value="Tabled">Tabled</option><option value="N/A (No Vote Required)">N/A (No Vote Required)</option></select></div>
                </div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agenda Title</label><input name="title" placeholder="Official Title" required defaultValue={editingItem?.itemData.title} className={`w-full p-4 border-2 rounded-2xl font-bold text-lg outline-none transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800 focus:border-blue-600 text-white' : 'bg-slate-50 border-slate-100 focus:border-blue-500'}`} /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">YouTube Segment URL (Optional)</label><input name="timestampUrl" placeholder="https://..." defaultValue={editingItem?.itemData.timestampUrl} className={`w-full p-4 border-2 rounded-2xl font-bold outline-none transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800 focus:border-blue-600 text-white' : 'bg-slate-50 border-slate-100 focus:border-blue-500'}`} /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Public Summary</label><textarea name="description" placeholder="Description..." rows="4" defaultValue={editingItem?.itemData.description} className={`w-full p-4 border-2 rounded-3xl text-lg outline-none transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800 focus:border-blue-600 text-white' : 'bg-slate-50 border-slate-100 focus:border-blue-500'}`}></textarea></div>
                <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black text-xl shadow-2xl transition-transform active:scale-95">Save Item</button>
              </form>
            </div>
          </div>
        )}

        {(isAddingCommissioner || editingCommissioner) && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
            <div className={`rounded-[32px] md:rounded-[56px] w-full max-w-2xl p-6 md:p-12 shadow-2xl max-h-[90vh] overflow-y-auto transition-colors ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-10"><h3 className={`text-2xl md:text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{editingCommissioner ? "Update Profile" : "New Member"}</h3><button onClick={() => {setIsAddingCommissioner(false); setEditingCommissioner(null);}} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={32}/></button></div>
              <form onSubmit={handleCommissionerSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label><input name="name" required defaultValue={editingCommissioner?.name} className={`w-full p-5 border-2 rounded-[28px] outline-none transition-all font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 focus:border-blue-600 text-white' : 'bg-slate-50 border-slate-100 focus:border-blue-500'}`} /></div>
                  <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">District</label><input name="district" required defaultValue={editingCommissioner?.district} className={`w-full p-5 border-2 rounded-[28px] outline-none transition-all font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 focus:border-blue-600 text-white' : 'bg-slate-50 border-slate-100 focus:border-blue-500'}`} /></div>
                  <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Title / Role</label><input name="role" placeholder="e.g. Mayor" defaultValue={editingCommissioner?.role} className={`w-full p-5 border-2 rounded-[28px] outline-none transition-all font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 focus:border-blue-600 text-white' : 'bg-slate-50 border-slate-100 focus:border-blue-500'}`} /></div>
                  <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Term</label><input name="currentTerm" defaultValue={editingCommissioner?.currentTerm} className={`w-full p-5 border-2 rounded-[28px] outline-none transition-all font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 focus:border-blue-600 text-white' : 'bg-slate-50 border-slate-100 focus:border-blue-500'}`} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Assumed Office</label><input name="assumedOffice" type="date" defaultValue={editingCommissioner?.assumedOffice} className={`w-full p-5 border-2 rounded-[28px] outline-none transition-all font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 focus:border-blue-600 text-white' : 'bg-slate-50 border-slate-100 focus:border-blue-500'}`} /></div>
                  <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Term Expires</label><input name="termExpires" type="date" defaultValue={editingCommissioner?.termExpires} className={`w-full p-5 border-2 rounded-[28px] outline-none transition-all font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 focus:border-blue-600 text-white' : 'bg-slate-50 border-slate-100 focus:border-blue-500'}`} /></div>
                </div>
                <div className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-colors ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                   <input type="checkbox" name="isActive" id="isActive" defaultChecked={editingCommissioner?.isActive ?? true} className="w-6 h-6 rounded border-slate-300 text-blue-600" />
                   <label htmlFor="isActive" className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Active Commissioner</label>
                </div>
                <input name="image" placeholder="Photo URL" defaultValue={editingCommissioner?.image} className={`w-full p-5 border-2 rounded-[28px] outline-none transition-all font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 focus:border-blue-600 text-white' : 'bg-slate-50 border-slate-100 focus:border-blue-500'}`} />
                <button type="submit" className="w-full bg-orange-500 text-white py-5 rounded-[24px] font-black text-xl shadow-2xl transition-transform active:scale-95">Save Member Archive</button>
              </form>
            </div>
          </div>
        )}

        {isLoginModalOpen && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className={`rounded-[40px] w-full max-w-md p-10 shadow-2xl relative transition-colors ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}><div className="flex justify-between items-center mb-10"><h3 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Admin Portal</h3><button onClick={() => setIsLoginModalOpen(false)} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={32}/></button></div>{loginError && (<div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold"><AlertCircle size={20} /> {loginError}</div>)}<form onSubmit={handleLogin} className="space-y-6"><input name="email" type="email" required placeholder="Email" className={`w-full p-4 border-2 rounded-2xl outline-none font-bold transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800 focus:border-blue-600 text-white' : 'bg-slate-50 border-slate-100 focus:border-blue-500'}`} /><input name="password" type="password" required placeholder="Password" className={`w-full p-4 border-2 rounded-2xl outline-none font-bold transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800 focus:border-blue-600 text-white' : 'bg-slate-50 border-slate-100 focus:border-blue-500'}`} /><button type="submit" disabled={isLoggingIn} className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-lg disabled:opacity-50 transition-transform active:scale-95">{isLoggingIn ? "Signing In..." : "Log In"}</button></form></div>
          </div>
        )}
      </main>
    </div>
  );
}