import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, LayoutDashboard, FileText, LogOut, Droplet, Heart, Scale, Mail, Lock, ChevronLeft, ChevronRight, ArrowLeft, Layers } from 'lucide-react';

// === 定义健康标准常量 ===
const STANDARDS = {
  glucose_fasting: 7.0,
  glucose_after_meal: 10.0,
  systolic_bp: 130,
  diastolic_bp: 80,
  hba1c: 7.0,
  triglycerides: 1.7,
  ldl_c: 2.6,
  // 体重没有绝对标准，暂不划红线
};

export default function App() {
  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [view, setView] = useState('dashboard');
  const [detailMetric, setDetailMetric] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // 表单状态
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [formData, setFormData] = useState({
    record_date: new Date().toISOString().split('T')[0],
    record_type: 'daily',
    glucose_fasting: '',
    glucose_after_meal: '',
    systolic_bp: '',
    diastolic_bp: '',
    hba1c: '',
    triglycerides: '',
    ldl_c: '',
    weight: ''
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRecords();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchRecords();
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchRecords = async () => {
    const { data, error } = await supabase.from('health_records').select('*').order('record_date', { ascending: true });
    if (!error) setRecords(data);
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    setAuthLoading(false);
    if (error) alert('登录失败: ' + error.message);
  };

  const handleSignUp = async (e) => {
    e.preventDefault(); setAuthLoading(true);
    const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
    setAuthLoading(false);
    if (error) alert('注册失败: ' + error.message); else alert('注册成功！已自动登录。');
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) return alert("密码需至少6位");
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);
    if (error) alert("修改失败: " + error.message); else { alert("✅ 密码修改成功"); setNewPassword(''); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = (await supabase.auth.getUser()).data.user;
    const payload = { ...formData, user_id: user.id };
    Object.keys(payload).forEach(key => (payload[key] === '' || payload[key] === null) && delete payload[key]);
    const { error } = await supabase.from('health_records').insert([payload]);
    if (!error) { alert('✅ 保存成功！'); fetchRecords(); setView('dashboard'); } else { alert('❌ 保存失败: ' + error.message); }
  };

  // --- 数据查找 ---
  const dailyData = records.filter(r => r.record_type === 'daily' || r.glucose_fasting || r.systolic_bp);
  const findLastRecordWith = (field) => [...records].reverse().find(r => r[field] != null && r[field] !== '') || {};
  
  const lastGlucoseRecord = findLastRecordWith('glucose_fasting');
  const lastBpRecord = findLastRecordWith('systolic_bp');
  const lastHba1cRecord = findLastRecordWith('hba1c');
  const lastTriRecord = findLastRecordWith('triglycerides');
  const lastWeightRecord = findLastRecordWith('weight'); // 新增：体重

  const lastBpString = lastBpRecord.systolic_bp ? `${lastBpRecord.systolic_bp}/${lastBpRecord.diastolic_bp}` : '--';
  const isBpHigh = lastBpRecord.systolic_bp > STANDARDS.systolic_bp || lastBpRecord.diastolic_bp > STANDARDS.diastolic_bp;

  // --- 分页 ---
  const reversedRecords = [...records].reverse();
  const totalPages = Math.ceil(reversedRecords.length / ITEMS_PER_PAGE);
  const currentTableData = reversedRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const openDetail = (metricType) => { setDetailMetric(metricType); setView('detail'); };

  if (!session) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-center"><h1 className="text-2xl font-bold text-white">HealthTracker</h1><p className="text-blue-100 mt-2">个人健康指标追踪</p></div>
        <div className="p-8 space-y-4">
          <input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="邮箱" className="w-full p-2 border rounded" />
          <input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="密码" className="w-full p-2 border rounded" />
          <div className="flex gap-2"><button onClick={handleLogin} disabled={authLoading} className="flex-1 bg-blue-600 text-white py-2 rounded">登录</button><button onClick={handleSignUp} disabled={authLoading} className="flex-1 border border-blue-600 text-blue-600 py-2 rounded">注册</button></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-800">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="bg-blue-600 p-1.5 rounded-lg"><Activity className="text-white" size={20} /></div><span className="text-xl font-bold text-gray-800 hidden sm:block">HealthTracker</span></div>
          <div className="flex items-center gap-2">
            <button onClick={() => setView('dashboard')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${view === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>概览</button>
            <button onClick={() => setView('entry')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${view === 'entry' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>记一笔</button>
            <div className="h-5 w-px bg-gray-300 mx-2"></div>
            <button onClick={() => supabase.auth.signOut()} className="text-gray-500 hover:text-red-500"><LogOut size={18} /></button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {view === 'dashboard' && (
          <div className="space-y-6">
            {/* 顶部指标卡片 (5列布局) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCard title="空腹血糖" value={lastGlucoseRecord.glucose_fasting} unit="mmol/L" limit={STANDARDS.glucose_fasting} icon={<Droplet size={20} className="text-blue-500"/>} onClick={() => openDetail('glucose')} clickable />
              <StatCard title="最新血压" value={lastBpString} unit="mmHg" customStatus={isBpHigh ? 'warning' : 'good'} limitStr={`<${STANDARDS.systolic_bp}/${STANDARDS.diastolic_bp}`} icon={<Heart size={20} className="text-rose-500"/>} onClick={() => openDetail('bp')} clickable />
              <StatCard title="HbA1c" value={lastHba1cRecord.hba1c} unit="%" limit={STANDARDS.hba1c} icon={<Activity size={20} className="text-purple-500"/>} onClick={() => openDetail('hba1c')} clickable />
              {/* 改用 Layers 图标表示血脂/甘油三酯 */}
              <StatCard title="甘油三酯" value={lastTriRecord.triglycerides} unit="mmol/L" limit={STANDARDS.triglycerides} icon={<Layers size={20} className="text-orange-500"/>} onClick={() => openDetail('triglycerides')} clickable />
              {/* 新增：体重卡片 */}
              <StatCard title="最新体重" value={lastWeightRecord.weight} unit="kg" icon={<Scale size={20} className="text-emerald-500"/>} onClick={() => openDetail('weight')} clickable />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-700 mb-4">血糖趋势</h3>
                <div className="h-60"><ResponsiveContainer width="100%" height="100%"><LineChart data={dailyData.slice(-20)}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="record_date" tick={{fontSize:11}}/><YAxis domain={[0,'auto']} tick={{fontSize:11}}/><Tooltip/><Legend/><ReferenceLine y={STANDARDS.glucose_fasting} stroke="red" strokeDasharray="3 3"/><Line type="monotone" dataKey="glucose_fasting" stroke="#3b82f6" dot={{r:3}} name="空腹"/><Line type="monotone" dataKey="glucose_after_meal" stroke="#10b981" dot={{r:3}} name="餐后"/></LineChart></ResponsiveContainer></div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-700 mb-4">血压趋势</h3>
                <div className="h-60"><ResponsiveContainer width="100%" height="100%"><LineChart data={dailyData.slice(-20).filter(d=>d.systolic_bp)}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="record_date" tick={{fontSize:11}}/><YAxis domain={['dataMin - 10','dataMax + 10']} tick={{fontSize:11}}/><Tooltip/><Legend/><ReferenceLine y={STANDARDS.systolic_bp} stroke="red" strokeDasharray="3 3"/><Line type="monotone" dataKey="systolic_bp" stroke="#f43f5e" name="高压"/><Line type="monotone" dataKey="diastolic_bp" stroke="#6366f1" name="低压"/></LineChart></ResponsiveContainer></div>
              </div>
            </div>

             <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 font-bold text-gray-700 flex justify-between"><span>📝 历史记录</span><span className="text-xs text-gray-400 font-normal">共 {reversedRecords.length} 条</span></div>
                <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-white text-gray-500 border-b"><tr><th className="px-6 py-3">日期</th><th className="px-6 py-3">血糖</th><th className="px-6 py-3">血压</th><th className="px-6 py-3">HbA1c</th><th className="px-6 py-3">体重</th></tr></thead><tbody className="divide-y divide-gray-50">
                  {currentTableData.map(r => (
                    <tr key={r.id}>
                      <td className="px-6 py-3 text-gray-900">{r.record_date}</td>
                      <td className={`px-6 py-3 font-medium ${r.glucose_fasting > STANDARDS.glucose_fasting ? 'text-red-500' : ''}`}>{r.glucose_fasting || '-'}</td>
                      <td className={`px-6 py-3 ${r.systolic_bp > STANDARDS.systolic_bp ? 'text-red-500' : ''}`}>{r.systolic_bp ? `${r.systolic_bp}/${r.diastolic_bp}` : '-'}</td>
                      <td className={`px-6 py-3 ${r.hba1c > STANDARDS.hba1c ? 'text-red-500' : ''}`}>{r.hba1c || '-'}</td>
                      <td className="px-6 py-3">{r.weight || '-'}</td>
                    </tr>
                  ))}
                  {currentTableData.length === 0 && <tr><td colSpan="5" className="text-center py-6 text-gray-400">暂无数据</td></tr>}
                </tbody></table></div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-between bg-gray-50"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex gap-1 text-sm disabled:opacity-30"><ChevronLeft size={16}/> 上一页</button><span className="text-xs text-gray-500">第 {currentPage} / {totalPages || 1} 页</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="flex gap-1 text-sm disabled:opacity-30">下一页 <ChevronRight size={16}/></button></div>
             </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-8"><h3 className="font-bold text-gray-800 mb-4 flex gap-2"><Lock className="text-gray-500" size={20}/> 账号安全</h3><div className="flex gap-4 items-end"><div className="flex-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">重设新密码</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="输入新密码..." className="w-full px-4 py-2 border rounded bg-gray-50"/></div><button onClick={handleUpdatePassword} disabled={passwordLoading} className="bg-gray-800 text-white px-6 py-2.5 rounded hover:bg-black disabled:opacity-50">{passwordLoading ? '...' : '修改'}</button></div></div>
          </div>
        )}

        {view === 'detail' && <DetailView metric={detailMetric} records={records} onBack={() => setView('dashboard')} />}

        {view === 'entry' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center"><h2 className="text-lg font-bold text-gray-800 flex gap-2"><FileText className="text-blue-600" size={20}/> 录入数据</h2><button onClick={() => setView('dashboard')} className="text-sm text-gray-500">取消</button></div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-gray-500 uppercase">日期</label><input type="date" value={formData.record_date} onChange={e => setFormData({...formData, record_date: e.target.value})} className="w-full p-2 border rounded bg-gray-50" /></div><div><label className="text-xs font-bold text-gray-500 uppercase">类型</label><select value={formData.record_type} onChange={e => setFormData({...formData, record_type: e.target.value})} className="w-full p-2 border rounded bg-gray-50"><option value="daily">日常监测</option><option value="checkup">医院体检</option></select></div></div>
                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100"><h3 className="font-bold text-blue-700 mb-3 flex gap-2 text-sm"><Droplet size={16}/> 血糖</h3><div className="grid grid-cols-2 gap-4"><InputGroup label="空腹" val={formData.glucose_fasting} setVal={v=>setFormData({...formData, glucose_fasting:v})} limit={STANDARDS.glucose_fasting}/><InputGroup label="餐后2h" val={formData.glucose_after_meal} setVal={v=>setFormData({...formData, glucose_after_meal:v})} limit={STANDARDS.glucose_after_meal}/></div></div>
                <div className="bg-rose-50/50 p-4 rounded-lg border border-rose-100"><h3 className="font-bold text-rose-700 mb-3 flex gap-2 text-sm"><Heart size={16}/> 血压</h3><div className="grid grid-cols-2 gap-4"><InputGroup label="收缩压" val={formData.systolic_bp} setVal={v=>setFormData({...formData, systolic_bp:v})} limit={STANDARDS.systolic_bp} unit="mmHg"/><InputGroup label="舒张压" val={formData.diastolic_bp} setVal={v=>setFormData({...formData, diastolic_bp:v})} limit={STANDARDS.diastolic_bp} unit="mmHg"/></div></div>
                <div className="bg-purple-50/50 p-4 rounded-lg border border-purple-100"><h3 className="font-bold text-purple-700 mb-3 flex gap-2 text-sm"><Activity size={16}/> 体检指标</h3><div className="grid grid-cols-2 gap-4 mb-4"><InputGroup label="糖化 HbA1c" val={formData.hba1c} setVal={v=>setFormData({...formData, hba1c:v})} limit={STANDARDS.hba1c} unit="%"/><InputGroup label="甘油三酯" val={formData.triglycerides} setVal={v=>setFormData({...formData, triglycerides:v})} limit={STANDARDS.triglycerides} unit="mmol/L"/></div><div className="grid grid-cols-2 gap-4"><InputGroup label="LDL-C" val={formData.ldl_c} setVal={v=>setFormData({...formData, ldl_c:v})} limit={STANDARDS.ldl_c} unit="mmol/L"/><InputGroup label="体重" val={formData.weight} setVal={v=>setFormData({...formData, weight:v})} unit="kg"/></div></div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-md">保存记录</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function DetailView({ metric, records, onBack }) {
  const config = {
    glucose: { title: '血糖历史', key1: 'glucose_fasting', name1: '空腹', key2: 'glucose_after_meal', name2: '餐后', color: '#3b82f6', limit: STANDARDS.glucose_fasting },
    bp: { title: '血压历史', key1: 'systolic_bp', name1: '高压', key2: 'diastolic_bp', name2: '低压', color: '#f43f5e', limit: STANDARDS.systolic_bp },
    hba1c: { title: '糖化 HbA1c 历史', key1: 'hba1c', name1: 'HbA1c', color: '#8b5cf6', limit: STANDARDS.hba1c },
    triglycerides: { title: '甘油三酯历史', key1: 'triglycerides', name1: '甘油三酯', color: '#f97316', limit: STANDARDS.triglycerides },
    // 新增：体重配置
    weight: { title: '体重变化趋势', key1: 'weight', name1: '体重 (kg)', color: '#10b981' },
  }[metric];

  const filteredData = records.filter(r => r[config.key1] != null && r[config.key1] !== '');
  const reversedData = [...filteredData].reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2"><button onClick={onBack} className="p-2 bg-white border rounded hover:bg-gray-50"><ArrowLeft size={20}/></button><h2 className="text-xl font-bold text-gray-800">{config.title}</h2></div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={filteredData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="record_date" tick={{fontSize:11}}/><YAxis domain={metric === 'bp' || metric === 'weight' ? ['dataMin - 5', 'dataMax + 5'] : [0, 'auto']} tick={{fontSize:11}}/><Tooltip/><Legend/>{config.limit && <ReferenceLine y={config.limit} stroke="red" strokeDasharray="3 3" label={{position:'insideRight',value:'标准',fill:'red',fontSize:10}}/>}<Line type="monotone" dataKey={config.key1} name={config.name1} stroke={config.color} strokeWidth={3} dot={{r:4}} />{config.key2 && <Line type="monotone" dataKey={config.key2} name={config.name2} stroke="#10b981" strokeWidth={3} dot={{r:4}} />}</LineChart></ResponsiveContainer></div></div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="bg-gray-50 px-6 py-3 border-b font-bold text-gray-700">列表数据</div><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-white text-gray-500 border-b"><tr><th className="px-6 py-3">日期</th><th className="px-6 py-3">{config.name1}</th>{config.key2 && <th className="px-6 py-3">{config.name2}</th>}<th className="px-6 py-3">备注</th></tr></thead><tbody className="divide-y divide-gray-50">{reversedData.map(r => (<tr key={r.id}><td className="px-6 py-3">{r.record_date}</td><td className={`px-6 py-3 font-medium ${config.limit && r[config.key1] > config.limit ? 'text-red-500' : ''}`}>{r[config.key1]}</td>{config.key2 && <td className="px-6 py-3">{r[config.key2]}</td>}<td className="px-6 py-3 text-gray-400 text-xs">{r.record_type==='checkup'?'体检':'日常'}</td></tr>))}</tbody></table></div></div>
    </div>
  );
}

function InputGroup({ label, val, setVal, limit, unit }) { const isOverLimit = limit && val && parseFloat(val) > limit; return (<div><div className="flex justify-between items-center mb-1"><label className="text-xs text-gray-500">{label}</label>{limit && <span className="text-[10px] bg-gray-100 px-1 rounded text-gray-400">标准 &lt; {limit}</span>}</div><input type="number" step="any" value={val} onChange={e => setVal(e.target.value)} className={`w-full p-2 border rounded outline-none ${isOverLimit ? 'border-red-300 text-red-600' : 'border-gray-200 focus:border-blue-500'}`} /></div>); }
function StatCard({ title, value, unit, icon, limit, limitStr, customStatus, onClick, clickable }) { const isWarning = customStatus === 'warning' || (limit && value && parseFloat(value) > limit); const displayLimit = limitStr || (limit ? `< ${limit}` : ''); return (<div onClick={clickable ? onClick : undefined} className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-full relative ${clickable ? 'cursor-pointer hover:shadow-md active:scale-95 transition-all' : ''}`}>{isWarning && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full m-2 animate-pulse"></div>}<div className="flex justify-between items-start mb-2"><span className="text-gray-500 text-xs font-medium">{title}</span>{icon}</div><div className="flex items-end justify-between"><div className="flex items-baseline gap-1"><span className={`text-xl font-bold ${isWarning ? 'text-red-600' : 'text-gray-800'}`}>{value || '--'}</span><span className="text-xs text-gray-400">{unit}</span></div>{displayLimit && <span className="text-[10px] px-1 bg-gray-50 text-gray-400 rounded">{displayLimit}</span>}</div></div>); }