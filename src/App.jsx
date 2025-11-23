import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Plus, Activity, LayoutDashboard, FileText, LogOut, Droplet, HeartPulse, Scale, Calendar } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [view, setView] = useState('dashboard'); // dashboard | entry
  const [formData, setFormData] = useState({
    record_date: new Date().toISOString().split('T')[0],
    record_type: 'daily',
    glucose_fasting: '',
    glucose_after_meal: '',
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
    const email = prompt("请输入邮箱接收登录链接:");
    if (email) await supabase.auth.signInWithOtp({ email });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = (await supabase.auth.getUser()).data.user;
    const payload = { ...formData, user_id: user.id };
    Object.keys(payload).forEach(key => (payload[key] === '' || payload[key] === null) && delete payload[key]);
    
    const { error } = await supabase.from('health_records').insert([payload]);
    if (!error) {
      alert('记录保存成功！');
      fetchRecords();
      setView('dashboard');
    } else {
      alert(error.message);
    }
  };

  // 数据预处理
  const dailyData = records.filter(r => r.record_type === 'daily' || r.glucose_fasting);
  const annualData = records.filter(r => r.hba1c || r.ldl_c);
  // 获取最新一次记录用于展示
  const lastRecord = records[records.length - 1] || {};

  // --- 组件部分 ---

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl text-center">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Activity className="text-blue-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">血糖健康管家</h1>
          <p className="text-gray-500 mb-8">安全记录，智能分析您的每一项健康指标</p>
          <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all shadow-md hover:shadow-lg">
            通过邮箱登录 / 注册
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-800">
      {/* 顶部导航栏 */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Activity className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold text-gray-800 tracking-tight">HealthTracker</span>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setView('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${view === 'dashboard' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <LayoutDashboard size={18} />
              <span className="hidden md:inline">概览</span>
            </button>
            
            <button 
              onClick={() => setView('entry')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${view === 'entry' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Plus size={18} />
              <span className="hidden md:inline">记一笔</span>
            </button>

            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            
            <button onClick={() => supabase.auth.signOut()} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="退出">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* === 视图：仪表盘 === */}
        {view === 'dashboard' && (
          <div className="space-y-8">
            
            {/* 顶部指标卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard 
                title="最新空腹血糖" 
                value={lastRecord.glucose_fasting} 
                unit="mmol/L" 
                icon={<Droplet className="text-blue-500" size={24} />} 
                status={lastRecord.glucose_fasting > 7.0 ? 'warning' : 'good'}
              />
              <StatCard 
                title="最新 HbA1c" 
                value={lastRecord.hba1c} 
                unit="%" 
                icon={<Activity className="text-purple-500" size={24} />}
                status={lastRecord.hba1c > 7.0 ? 'warning' : 'good'}
              />
              <StatCard 
                title="最新 LDL-C" 
                value={lastRecord.ldl_c} 
                unit="mmol/L" 
                icon={<HeartPulse className="text-red-500" size={24} />}
              />
              <StatCard 
                title="最新体重" 
                value={lastRecord.weight} 
                unit="kg" 
                icon={<Scale className="text-green-500" size={24} />}
              />
            </div>

            {/* 图表区域 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                    <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                    血糖趋势
                  </h3>
                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded text-gray-500">近30次记录</span>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyData.slice(-30)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="record_date" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                      <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Legend verticalAlign="top" height={36}/>
                      <ReferenceLine y={7.0} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: '警戒线', fill: '#ef4444', fontSize: 10 }} />
                      <Line type="monotone" dataKey="glucose_fasting" name="空腹" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                      <Line type="monotone" dataKey="glucose_after_meal" name="餐后2h" stroke="#10b981" strokeWidth={3} dot={{r: 4}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                    <span className="w-2 h-6 bg-purple-500 rounded-full"></span>
                    年度指标对比
                  </h3>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={annualData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="record_date" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" orientation="left" stroke="#8b5cf6" tickLine={false} axisLine={false} />
                      <YAxis yAxisId="right" orientation="right" stroke="#f43f5e" tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Legend verticalAlign="top" height={36}/>
                      <Bar yAxisId="left" dataKey="hba1c" name="糖化 HbA1c (%)" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={30} />
                      <Bar yAxisId="right" dataKey="ldl_c" name="坏胆固醇 LDL-C" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 数据表格 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                 <h3 className="font-bold text-gray-800 text-lg">📝 详细记录</h3>
                 <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">查看全部 &rarr;</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-medium text-xs">
                    <tr>
                      <th className="px-6 py-4">日期</th>
                      <th className="px-6 py-4">类型</th>
                      <th className="px-6 py-4">空腹血糖</th>
                      <th className="px-6 py-4">餐后2h</th>
                      <th className="px-6 py-4">HbA1c</th>
                      <th className="px-6 py-4">LDL-C</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {records.slice().reverse().slice(0, 5).map(r => (
                      <tr key={r.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{r.record_date}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            r.record_type === 'checkup' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {r.record_type === 'checkup' ? '年度体检' : '日常监测'}
                          </span>
                        </td>
                        <td className={`px-6 py-4 font-bold ${Number(r.glucose_fasting) > 7 ? 'text-red-500' : 'text-gray-700'}`}>
                          {r.glucose_fasting || '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{r.glucose_after_meal || '-'}</td>
                        <td className="px-6 py-4 text-gray-600">{r.hba1c || '-'}</td>
                        <td className="px-6 py-4 text-gray-600">{r.ldl_c || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* === 视图：录入表单 === */}
        {view === 'entry' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="text-blue-600" /> 新增记录
                </h2>
                <p className="text-gray-500 text-sm mt-1">请填写下方的健康数据</p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">测量日期</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input type="date" value={formData.record_date} onChange={e => setFormData({...formData, record_date: e.target.value})} 
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" />
                    </div>
                  </div>
                  <div className="col-span-1">
                     <label className="block text-sm font-semibold text-gray-700 mb-2">记录类型</label>
                     <select value={formData.record_type} onChange={e => setFormData({...formData, record_type: e.target.value})} 
                       className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                       <option value="daily">📅 日常监测</option>
                       <option value="checkup">🏥 医院体检</option>
                     </select>
                  </div>
                </div>

                {/* 血糖板块 */}
                <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                  <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Droplet size={16}/> 血糖数据
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="空腹血糖 (FBG)" placeholder="如 6.5" value={formData.glucose_fasting} onChange={v => setFormData({...formData, glucose_fasting: v})} />
                    <InputGroup label="餐后2h血糖" placeholder="如 8.2" value={formData.glucose_after_meal} onChange={v => setFormData({...formData, glucose_after_meal: v})} />
                  </div>
                </div>

                {/* 重点指标板块 */}
                <div className="bg-purple-50/50 p-5 rounded-xl border border-purple-100">
                  <h3 className="font-bold text-purple-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Activity size={16}/> 核心指标 (体检)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputGroup label="HbA1c (%)" placeholder="%" value={formData.hba1c} onChange={v => setFormData({...formData, hba1c: v})} />
                    <InputGroup label="LDL-C" placeholder="mmol/L" value={formData.ldl_c} onChange={v => setFormData({...formData, ldl_c: v})} />
                    <InputGroup label="甘油三酯" placeholder="mmol/L" value={formData.triglycerides} onChange={v => setFormData({...formData, triglycerides: v})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="体重 (kg)" placeholder="kg" value={formData.weight} onChange={v => setFormData({...formData, weight: v})} />
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 active:scale-[0.99] transition-all flex justify-center items-center gap-2 shadow-lg shadow-blue-200">
                    <Plus size={20} /> 保存本次记录
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// 辅助组件：输入框
function InputGroup({ label, placeholder, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <input 
        type="number" step="0.01" 
        placeholder={placeholder} 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-gray-300" 
      />
    </div>
  );
}

// 辅助组件：数据卡片
function StatCard({ title, value, unit, icon, status }) {
  const isWarning = status === 'warning';
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold ${isWarning ? 'text-red-600' : 'text-gray-900'}`}>
            {value || '--'}
          </span>
          <span className="text-xs text-gray-400">{unit}</span>
        </div>
      </div>
      <div className={`p-3 rounded-xl ${isWarning ? 'bg-red-50' : 'bg-gray-50'}`}>
        {icon}
      </div>
    </div>
  );
}