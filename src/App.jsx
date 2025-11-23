import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, LayoutDashboard, FileText, LogOut, Droplet, Heart, Scale, Mail, Lock, AlertCircle } from 'lucide-react';

// === 定义健康标准常量 ===
const STANDARDS = {
  glucose_fasting: 7.0,
  glucose_after_meal: 10.0,
  systolic_bp: 130,
  diastolic_bp: 80,
  hba1c: 7.0,
  triglycerides: 1.7,
  ldl_c: 2.6,
};

export default function App() {
  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [view, setView] = useState('dashboard');
  
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // 新增：修改密码相关状态
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
    const { data, error } = await supabase
      .from('health_records')
      .select('*')
      .order('record_date', { ascending: true });
    if (!error) setRecords(data);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    setAuthLoading(false);
    if (error) alert('登录失败: ' + error.message + '\n\n提示：如果是第一次使用该密码，请点击“注册新账号”。');
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    });
    setAuthLoading(false);
    if (error) {
      alert('注册失败: ' + error.message);
    } else {
      alert('注册成功！已为您自动登录。');
    }
  };

  // 新增：发送重置邮件
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const email = prompt("请输入您的注册邮箱用于重置密码：");
    if (!email) return;
    
    // 这里的 window.location.origin 会自动获取你当前的网址(不管是localhost还是vercel)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin, 
    });
    
    if (error) alert("发送失败: " + error.message);
    else alert("✅ 重置邮件已发送！\n请查收邮件并点击链接，跳转回来后在首页底部修改新密码。");
  };

  // 新增：更新密码
  const handleUpdatePassword = async () => {
    if (!newPassword) return alert("请输入新密码");
    if (newPassword.length < 6) return alert("密码长度不能少于6位");
    
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);

    if (error) {
      alert("修改失败: " + error.message);
    } else {
      alert("✅ 密码修改成功！请记住新密码。");
      setNewPassword(''); 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = (await supabase.auth.getUser()).data.user;
    const payload = { ...formData, user_id: user.id };
    Object.keys(payload).forEach(key => (payload[key] === '' || payload[key] === null) && delete payload[key]);
    
    const { error } = await supabase.from('health_records').insert([payload]);
    if (!error) {
      alert('✅ 记录保存成功！');
      fetchRecords();
      setView('dashboard');
    } else {
      alert('❌ 保存失败: ' + error.message);
    }
  };

   // 1. 数据预处理：给图表用的数据 (保持不变)
  const dailyData = records.filter(r => r.record_type === 'daily' || r.glucose_fasting || r.systolic_bp);

  // 2. 智能查找最新数据 (核心修复)
  // 定义一个函数：倒序查找，找到最近一条包含该字段的记录
  const findLastRecordWith = (field) => {
    // [...records] 是为了不改变原数组，reverse() 是倒序
    return [...records].reverse().find(r => r[field] != null && r[field] !== '') || {};
  };

  // 分别查找各项指标的“最新一次记录”
  const lastGlucoseRecord = findLastRecordWith('glucose_fasting');
  const lastBpRecord = findLastRecordWith('systolic_bp');
  const lastHba1cRecord = findLastRecordWith('hba1c');
  const lastTriRecord = findLastRecordWith('triglycerides');

  // 3. 格式化显示数据
  // 血压显示
  const lastBpString = lastBpRecord.systolic_bp 
    ? `${lastBpRecord.systolic_bp}/${lastBpRecord.diastolic_bp}` 
    : '--';
  
  // 血压状态判断
  const isBpHigh = lastBpRecord.systolic_bp > STANDARDS.systolic_bp || lastBpRecord.diastolic_bp > STANDARDS.diastolic_bp;

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-blue-600 p-8 text-center">
             <h1 className="text-2xl font-bold text-white">HealthTracker</h1>
             <p className="text-blue-100 mt-2">个人健康指标追踪</p>
          </div>
          <div className="p-8">
            <div className="mb-4 text-sm text-yellow-600 bg-yellow-50 p-3 rounded border border-yellow-100">
               ⚠️ 首次使用密码登录？请先点击右侧的 <b>"注册新账号"</b> 按钮。
            </div>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">电子邮箱</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500" placeholder="name@example.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500" placeholder="••••••••" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={handleLogin} disabled={authLoading} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">登录</button>
                <button onClick={handleSignUp} disabled={authLoading} className="flex-1 bg-white text-blue-600 border border-blue-600 py-2.5 rounded-lg font-bold hover:bg-blue-50 disabled:opacity-50">注册新账号</button>
              </div>
              <div className="text-center pt-2">
                <button onClick={handleResetPassword} className="text-sm text-gray-500 hover:text-blue-600 underline">忘记密码了？</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-800">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-lg"><Activity className="text-white" size={20} /></div>
            <span className="text-xl font-bold text-gray-800 hidden sm:block">HealthTracker</span>
          </div>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <StatCard 
                title="空腹血糖" 
                value={lastGlucoseRecord.glucose_fasting} // 改了这里
                unit="mmol/L" 
                limit={STANDARDS.glucose_fasting}
                icon={<Droplet size={20} className="text-blue-500"/>} 
              />
              <StatCard 
                title="最新血压" 
                value={lastBpString} // 改了这里
                unit="mmHg" 
                customStatus={isBpHigh ? 'warning' : 'good'}
                limitStr={`<${STANDARDS.systolic_bp}/${STANDARDS.diastolic_bp}`}
                icon={<Heart size={20} className="text-rose-500"/>} 
              />
              <StatCard 
                title="HbA1c" 
                value={lastHba1cRecord.hba1c} // 改了这里
                unit="%" 
                limit={STANDARDS.hba1c}
                icon={<Activity size={20} className="text-purple-500"/>} 
              />
              <StatCard 
                title="甘油三酯" 
                value={lastTriRecord.triglycerides} // 改了这里
                unit="mmol/L" 
                limit={STANDARDS.triglycerides}
                icon={<Scale size={20} className="text-orange-500"/>} 
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><span className="w-1.5 h-4 bg-blue-500 rounded-full"></span> 血糖趋势</h3>
                <div className="h-60"><ResponsiveContainer width="100%" height="100%"><LineChart data={dailyData.slice(-20)}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="record_date" tick={{fontSize:11}}/><YAxis domain={[0,'auto']} tick={{fontSize:11}}/><Tooltip/><Legend/><ReferenceLine y={STANDARDS.glucose_fasting} stroke="red" strokeDasharray="3 3" label={{position:'right', value:'7.0', fill:'red', fontSize:10}}/><Line type="monotone" dataKey="glucose_fasting" stroke="#3b82f6" dot={{r:3}} name="空腹"/><Line type="monotone" dataKey="glucose_after_meal" stroke="#10b981" dot={{r:3}} name="餐后"/></LineChart></ResponsiveContainer></div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><span className="w-1.5 h-4 bg-rose-500 rounded-full"></span> 血压趋势</h3>
                <div className="h-60"><ResponsiveContainer width="100%" height="100%"><LineChart data={dailyData.slice(-20).filter(d=>d.systolic_bp)}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="record_date" tick={{fontSize:11}}/><YAxis domain={['dataMin - 10','dataMax + 10']} tick={{fontSize:11}}/><Tooltip/><Legend/><ReferenceLine y={STANDARDS.systolic_bp} stroke="red" strokeDasharray="3 3"/><Line type="monotone" dataKey="systolic_bp" stroke="#f43f5e" name="高压"/><Line type="monotone" dataKey="diastolic_bp" stroke="#6366f1" name="低压"/></LineChart></ResponsiveContainer></div>
              </div>
            </div>

             <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 font-bold text-gray-700">📝 最近记录</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white text-gray-500 border-b">
                      <tr><th className="px-6 py-3">日期</th><th className="px-6 py-3">血糖</th><th className="px-6 py-3">血压</th><th className="px-6 py-3">HbA1c</th><th className="px-6 py-3">甘油三酯</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {records.slice().reverse().slice(0, 5).map(r => (
                        <tr key={r.id}>
                          <td className="px-6 py-3 text-gray-900">{r.record_date}</td>
                          <td className={`px-6 py-3 font-medium ${r.glucose_fasting > STANDARDS.glucose_fasting ? 'text-red-500' : ''}`}>{r.glucose_fasting || '-'}</td>
                          <td className={`px-6 py-3 ${r.systolic_bp > STANDARDS.systolic_bp ? 'text-red-500' : ''}`}>{r.systolic_bp ? `${r.systolic_bp}/${r.diastolic_bp}` : '-'}</td>
                          <td className={`px-6 py-3 ${r.hba1c > STANDARDS.hba1c ? 'text-red-500' : ''}`}>{r.hba1c || '-'}</td>
                          <td className={`px-6 py-3 ${r.triglycerides > STANDARDS.triglycerides ? 'text-red-500' : ''}`}>{r.triglycerides || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>

            {/* === 修改密码板块 === */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-8">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Lock className="text-gray-500" size={20}/> 账号安全
              </h3>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">重设新密码</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="输入新密码 (至少6位)..." 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  />
                </div>
                <button 
                  onClick={handleUpdatePassword}
                  disabled={passwordLoading}
                  className="w-full md:w-auto bg-gray-800 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-black transition-colors disabled:opacity-50"
                >
                  {passwordLoading ? '保存中...' : '确认修改密码'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">提示：如果您是通过“忘记密码”邮件进来的，请在此处设置您的新密码。</p>
            </div>

          </div>
        )}

        {view === 'entry' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FileText className="text-blue-600" size={20}/> 录入数据</h2>
                <button onClick={() => setView('dashboard')} className="text-sm text-gray-500 hover:text-gray-800">取消</button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">日期</label><input type="date" value={formData.record_date} onChange={e => setFormData({...formData, record_date: e.target.value})} className="w-full p-2 border rounded bg-gray-50" /></div>
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">类型</label><select value={formData.record_type} onChange={e => setFormData({...formData, record_type: e.target.value})} className="w-full p-2 border rounded bg-gray-50"><option value="daily">日常监测</option><option value="checkup">医院体检</option></select></div>
                </div>

                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <h3 className="font-bold text-blue-700 mb-3 flex items-center gap-2 text-sm"><Droplet size={16}/> 血糖</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="空腹 (FBG)" val={formData.glucose_fasting} setVal={v=>setFormData({...formData, glucose_fasting:v})} limit={STANDARDS.glucose_fasting}/>
                    <InputGroup label="餐后2h" val={formData.glucose_after_meal} setVal={v=>setFormData({...formData, glucose_after_meal:v})} limit={STANDARDS.glucose_after_meal}/>
                  </div>
                </div>

                <div className="bg-rose-50/50 p-4 rounded-lg border border-rose-100">
                  <h3 className="font-bold text-rose-700 mb-3 flex items-center gap-2 text-sm"><Heart size={16}/> 血压</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="收缩压 (高压)" val={formData.systolic_bp} setVal={v=>setFormData({...formData, systolic_bp:v})} limit={STANDARDS.systolic_bp} unit="mmHg"/>
                    <InputGroup label="舒张压 (低压)" val={formData.diastolic_bp} setVal={v=>setFormData({...formData, diastolic_bp:v})} limit={STANDARDS.diastolic_bp} unit="mmHg"/>
                  </div>
                </div>

                <div className="bg-purple-50/50 p-4 rounded-lg border border-purple-100">
                  <h3 className="font-bold text-purple-700 mb-3 flex items-center gap-2 text-sm"><Activity size={16}/> 体检指标</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <InputGroup label="糖化 HbA1c" val={formData.hba1c} setVal={v=>setFormData({...formData, hba1c:v})} limit={STANDARDS.hba1c} unit="%"/>
                    <InputGroup label="甘油三酯" val={formData.triglycerides} setVal={v=>setFormData({...formData, triglycerides:v})} limit={STANDARDS.triglycerides} unit="mmol/L"/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="LDL-C (坏胆固醇)" val={formData.ldl_c} setVal={v=>setFormData({...formData, ldl_c:v})} limit={STANDARDS.ldl_c} unit="mmol/L"/>
                    <InputGroup label="体重" val={formData.weight} setVal={v=>setFormData({...formData, weight:v})} unit="kg"/>
                  </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all">保存记录</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function InputGroup({ label, val, setVal, limit, unit }) {
  const isOverLimit = limit && val && parseFloat(val) > limit;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="block text-xs text-gray-500">{label}</label>
        {limit && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 rounded">标准 &lt; {limit}</span>}
      </div>
      <input 
        type="number" step="any" value={val} onChange={e => setVal(e.target.value)} 
        className={`w-full px-3 py-2 border rounded-md outline-none bg-white transition-colors ${isOverLimit ? 'border-red-300 text-red-600 focus:ring-red-200' : 'border-gray-200 focus:ring-1 focus:ring-blue-500'}`} 
      />
      {unit && <span className="text-[10px] text-gray-400 absolute right-8 mt-[-26px] hidden">{unit}</span>}
    </div>
  );
}

function StatCard({ title, value, unit, icon, limit, limitStr, customStatus }) {
  const isWarning = customStatus === 'warning' || (limit && value && parseFloat(value) > limit);
  const displayLimit = limitStr || (limit ? `< ${limit}` : '');

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-full relative overflow-hidden">
      {isWarning && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full m-2 animate-pulse"></div>}
      <div className="flex justify-between items-start mb-2">
        <span className="text-gray-500 text-xs font-medium">{title}</span>
        {icon}
      </div>
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span className={`text-xl font-bold ${isWarning ? 'text-red-600' : 'text-gray-800'}`}>{value || '--'}</span>
          <span className="text-xs text-gray-400">{unit}</span>
        </div>
        {displayLimit && (
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded-md">
            {displayLimit}
          </span>
        )}
      </div>
    </div>
  );
}