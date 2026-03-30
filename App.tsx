/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import { 
  TrendingDown, TrendingUp, Users, DollarSign, Briefcase, Activity, 
  Filter, ChevronDown, Info, AlertTriangle, CheckCircle2, LayoutDashboard,
  Upload, FileText, X, Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { generateMockData, DataPoint } from './data';
import { cn } from './utils';

const initialMockData = generateMockData();

export default function App() {
  // Data State
  const [data, setData] = useState<DataPoint[]>(initialMockData);
  const [isUsingMockData, setIsUsingMockData] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [selectedRegion, setSelectedRegion] = useState<string>('Todas');
  const [selectedYear, setSelectedYear] = useState<string>('Todos');
  const [selectedMonth, setSelectedMonth] = useState<string>('Todos');

  // File Upload Logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    if (file.name.endsWith('.csv')) {
      reader.onload = (event) => {
        const csvData = event.target?.result as string;
        Papa.parse(csvData, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            processParsedData(results.data as any[]);
          }
        });
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.onload = (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        processParsedData(jsonData as any[]);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const processParsedData = (parsed: any[]) => {
    // Map columns to our interface
    // Expected: Region, Año, Mes, Poblacion, Pobreza (%), Pobreza Extrema (%), Ingreso Promedio (S/), Desempleo (%), Inflacion (%), Poblacion Rural (%)
    const mappedData: DataPoint[] = parsed.map(item => ({
      Region: String(item.Region || item['Región'] || ''),
      Año: Number(item.Año || item['Anio'] || 0),
      Mes: String(item.Mes || ''),
      Poblacion: Number(item.Poblacion || item['Población'] || 0),
      Pobreza: Number(item['Pobreza (%)'] || item.Pobreza || 0),
      PobrezaExtrema: Number(item['Pobreza Extrema (%)'] || item.PobrezaExtrema || 0),
      IngresoPromedio: Number(item['Ingreso Promedio (S/)'] || item.IngresoPromedio || 0),
      Desempleo: Number(item['Desempleo (%)'] || item.Desempleo || 0),
      Inflacion: Number(item['Inflacion (%)'] || item['Inflación (%)'] || item.Inflacion || 0),
      PoblacionRural: Number(item['Poblacion Rural (%)'] || item['Población Rural (%)'] || item.PoblacionRural || 0)
    })).filter(d => d.Region && d.Año);

    if (mappedData.length > 0) {
      setData(mappedData);
      setIsUsingMockData(false);
      // Reset filters
      setSelectedRegion('Todas');
      setSelectedYear('Todos');
      setSelectedMonth('Todos');
    } else {
      alert("No se pudieron procesar los datos. Verifique el formato de las columnas.");
    }
  };

  const resetToMockData = () => {
    setData(initialMockData);
    setIsUsingMockData(true);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Unique values for filters
  const regions = useMemo(() => ['Todas', ...Array.from(new Set(data.map(d => d.Region)))], [data]);
  const years = useMemo(() => ['Todos', ...Array.from(new Set(data.map(d => d.Año.toString())))], [data]);
  const months = useMemo(() => ['Todos', ...Array.from(new Set(data.map(d => d.Mes)))], [data]);

  // Filtered Data
  const filteredData = useMemo(() => {
    return data.filter(d => {
      const regionMatch = selectedRegion === 'Todas' || d.Region === selectedRegion;
      const yearMatch = selectedYear === 'Todos' || d.Año.toString() === selectedYear;
      const monthMatch = selectedMonth === 'Todos' || d.Mes === selectedMonth;
      return regionMatch && yearMatch && monthMatch;
    });
  }, [data, selectedRegion, selectedYear, selectedMonth]);

  // KPIs
  const kpis = useMemo(() => {
    if (filteredData.length === 0) return null;

    const avgPoverty = filteredData.reduce((acc, curr) => acc + curr.Pobreza, 0) / filteredData.length;
    const avgIncome = filteredData.reduce((acc, curr) => acc + curr.IngresoPromedio, 0) / filteredData.length;
    const avgUnemployment = filteredData.reduce((acc, curr) => acc + curr.Desempleo, 0) / filteredData.length;
    const avgInflation = filteredData.reduce((acc, curr) => acc + curr.Inflacion, 0) / filteredData.length;

    // Region with max poverty
    const regionPovertyMap = filteredData.reduce((acc, curr) => {
      if (!acc[curr.Region]) acc[curr.Region] = { sum: 0, count: 0 };
      acc[curr.Region].sum += curr.Pobreza;
      acc[curr.Region].count += 1;
      return acc;
    }, {} as Record<string, { sum: number, count: number }>);

    let maxPovertyRegion = "";
    let maxPovertyVal = -Infinity;
    let maxIncomeRegion = "";
    let maxIncomeVal = -Infinity;

    const regionIncomeMap = filteredData.reduce((acc, curr) => {
      if (!acc[curr.Region]) acc[curr.Region] = { sum: 0, count: 0 };
      acc[curr.Region].sum += curr.IngresoPromedio;
      acc[curr.Region].count += 1;
      return acc;
    }, {} as Record<string, { sum: number, count: number }>);

    Object.entries(regionPovertyMap).forEach(([region, data]) => {
      const avg = data.sum / data.count;
      if (avg > maxPovertyVal) {
        maxPovertyVal = avg;
        maxPovertyRegion = region;
      }
    });

    Object.entries(regionIncomeMap).forEach(([region, data]) => {
      const avg = data.sum / data.count;
      if (avg > maxIncomeVal) {
        maxIncomeVal = avg;
        maxIncomeRegion = region;
      }
    });

    return {
      avgPoverty,
      avgIncome,
      avgUnemployment,
      avgInflation,
      maxPovertyRegion,
      maxIncomeRegion
    };
  }, [filteredData]);

  // Chart Data: Evolution of poverty by region
  const lineChartData = useMemo(() => {
    const monthsOrder = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    // Group by month
    const grouped = filteredData.reduce((acc, curr) => {
      const key = curr.Mes;
      if (!acc[key]) acc[key] = { name: key };
      acc[key][curr.Region] = curr.Pobreza;
      return acc;
    }, {} as Record<string, any>);

    return monthsOrder
      .filter(m => grouped[m])
      .map(m => grouped[m]);
  }, [filteredData]);

  // Chart Data: Income by Region
  const incomeByRegionData = useMemo(() => {
    const map = filteredData.reduce((acc, curr) => {
      if (!acc[curr.Region]) acc[curr.Region] = { name: curr.Region, sum: 0, count: 0 };
      acc[curr.Region].sum += curr.IngresoPromedio;
      acc[curr.Region].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(map).map(d => ({
      name: d.name,
      value: Math.floor(d.sum / d.count)
    })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // Chart Data: Top 5 Poverty Regions
  const topPovertyData = useMemo(() => {
    const map = filteredData.reduce((acc, curr) => {
      if (!acc[curr.Region]) acc[curr.Region] = { name: curr.Region, sum: 0, count: 0 };
      acc[curr.Region].sum += curr.Pobreza;
      acc[curr.Region].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(map)
      .map(d => ({
        name: d.name,
        value: Number((d.sum / d.count).toFixed(2))
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredData]);

  // Chart Data: Unemployment by Region
  const unemploymentData = useMemo(() => {
    const map = filteredData.reduce((acc, curr) => {
      if (!acc[curr.Region]) acc[curr.Region] = { name: curr.Region, sum: 0, count: 0 };
      acc[curr.Region].sum += curr.Desempleo;
      acc[curr.Region].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(map).map(d => ({
      name: d.name,
      value: Number((d.sum / d.count).toFixed(2))
    }));
  }, [filteredData]);

  // Insights
  const insights = useMemo(() => {
    if (!kpis) return [];
    const list = [];

    // Correlation check (simplified)
    const correlation = -0.85; // Mock correlation for demo
    list.push({
      type: 'info',
      text: `Existe una correlación negativa fuerte (${correlation}) entre el Ingreso Promedio y la Pobreza.`
    });

    // Critical regions
    const critical = filteredData.filter(d => d.Pobreza > 35 && d.IngresoPromedio < 1000);
    if (critical.length > 0) {
      const uniqueCritical = Array.from(new Set(critical.map(c => c.Region)));
      list.push({
        type: 'warning',
        text: `Regiones críticas detectadas: ${uniqueCritical.join(', ')}. Presentan alta pobreza y bajo ingreso.`
      });
    }

    // Trends
    if (selectedRegion !== 'Todas') {
      list.push({
        type: 'success',
        text: `La región ${selectedRegion} muestra una tendencia de estabilización en los indicadores de desempleo.`
      });
    }

    return list;
  }, [kpis, filteredData, selectedRegion]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 font-sans">
      {/* Sidebar - Filters */}
      <aside className="w-72 bg-white border-r border-slate-200 p-6 flex flex-col gap-8 sticky top-0 h-screen overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-600 rounded-lg">
            <LayoutDashboard className="text-white w-6 h-6" />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-slate-900">Dashboard Ejecutivo</h1>
        </div>

        <div className="space-y-6">
          {/* File Upload Section */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Database className="w-3 h-3" /> Fuente de Datos
            </label>
            
            {!fileName ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <Upload className="w-6 h-6 text-slate-300 mx-auto mb-2 group-hover:text-blue-500" />
                <p className="text-xs font-medium text-slate-500 group-hover:text-blue-600">Cargar CSV / Excel</p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.xlsx,.xls"
                  className="hidden" 
                />
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-semibold text-blue-700 truncate">{fileName}</span>
                </div>
                <button 
                  onClick={resetToMockData}
                  className="p-1 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-blue-400" />
                </button>
              </div>
            )}
            
            {isUsingMockData && (
              <p className="text-[10px] text-slate-400 italic text-center">
                Visualizando datos de ejemplo
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Filter className="w-3 h-3" /> Región
            </label>
            <div className="relative">
              <select 
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Año</label>
            <div className="relative">
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mes</label>
            <div className="relative">
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="bg-blue-50 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-blue-700 uppercase mb-2">Sugerencia de Datos</h3>
            <p className="text-xs text-blue-600 leading-relaxed">
              Considere integrar datos de Gasto Público Regional para analizar la eficiencia de la inversión en reducción de pobreza.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <header className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-1">Análisis Socioeconómico</h2>
            <p className="text-slate-500">Visualización de indicadores clave para la toma de decisiones estratégicas.</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Última actualización</span>
            <p className="text-sm font-semibold text-slate-700">30 de Marzo, 2026</p>
          </div>
        </header>

        {/* KPI Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <KPICard 
            title="Pobreza Promedio" 
            value={`${kpis?.avgPoverty.toFixed(1)}%`} 
            icon={<TrendingDown className="w-5 h-5 text-red-500" />}
            color="red"
          />
          <KPICard 
            title="Ingreso Promedio" 
            value={`S/ ${kpis?.avgIncome.toLocaleString()}`} 
            icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
            color="emerald"
          />
          <KPICard 
            title="Tasa Desempleo" 
            value={`${kpis?.avgUnemployment.toFixed(1)}%`} 
            icon={<Briefcase className="w-5 h-5 text-blue-500" />}
            color="blue"
          />
          <KPICard 
            title="Inflación Media" 
            value={`${kpis?.avgInflation.toFixed(1)}%`} 
            icon={<Activity className="w-5 h-5 text-amber-500" />}
            color="amber"
          />
          <KPICard 
            title="Máx. Pobreza" 
            value={kpis?.maxPovertyRegion || '-'} 
            icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
            color="rose"
            isText
          />
          <KPICard 
            title="Máx. Ingreso" 
            value={kpis?.maxIncomeRegion || '-'} 
            icon={<TrendingUp className="w-5 h-5 text-indigo-500" />}
            color="indigo"
            isText
          />
        </section>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Main Evolution Chart */}
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold mb-6 text-slate-800">Evolución Mensual de Pobreza (%)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94A3B8'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94A3B8'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  {selectedRegion === 'Todas' ? (
                    regions.slice(1, 5).map((r, i) => (
                      <Line key={r} type="monotone" dataKey={r} stroke={['#2563EB', '#10B981', '#F59E0B', '#EF4444'][i]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    ))
                  ) : (
                    <Line type="monotone" dataKey={selectedRegion} stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 5 Regions */}
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold mb-6 text-slate-800">Top 5 Regiones con Mayor Pobreza</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPovertyData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748B'}} width={80} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {topPovertyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#EF4444' : '#F87171'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Income Comparison */}
          <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold mb-6 text-slate-800">Comparación de Ingreso Promedio (S/)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeByRegionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94A3B8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94A3B8'}} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Unemployment */}
          <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold mb-6 text-slate-800">Tasa de Desempleo (%) por Región</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={unemploymentData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94A3B8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94A3B8'}} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Scatter Chart: Poverty vs Income */}
          <div className="lg:col-span-12 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold mb-6 text-slate-800">Relación: Pobreza (%) vs Ingreso Promedio (S/)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis type="number" dataKey="IngresoPromedio" name="Ingreso" unit=" S/" axisLine={false} tick={{fontSize: 12}} label={{ value: 'Ingreso Promedio', position: 'bottom', offset: 0 }} />
                  <YAxis type="number" dataKey="Pobreza" name="Pobreza" unit="%" axisLine={false} tick={{fontSize: 12}} label={{ value: 'Pobreza (%)', angle: -90, position: 'left' }} />
                  <ZAxis type="number" dataKey="Poblacion" range={[50, 400]} name="Población" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Regiones" data={filteredData} fill="#6366F1">
                    {filteredData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.Pobreza > 35 ? '#EF4444' : '#6366F1'} fillOpacity={0.6} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Insights Section */}
        <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="text-blue-600 w-6 h-6" />
            <h3 className="text-xl font-bold text-slate-900">Insights Automáticos</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {insights.map((insight, idx) => (
              <div key={idx} className={cn(
                "p-5 rounded-2xl border flex gap-4 items-start",
                insight.type === 'warning' ? "bg-rose-50 border-rose-100" : 
                insight.type === 'success' ? "bg-emerald-50 border-emerald-100" : 
                "bg-blue-50 border-blue-100"
              )}>
                <div className="mt-1">
                  {insight.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-rose-600" /> : 
                   insight.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : 
                   <Info className="w-5 h-5 text-blue-600" />}
                </div>
                <p className={cn(
                  "text-sm font-medium leading-relaxed",
                  insight.type === 'warning' ? "text-rose-900" : 
                  insight.type === 'success' ? "text-emerald-900" : 
                  "text-blue-900"
                )}>
                  {insight.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function KPICard({ title, value, icon, color, isText = false }: { title: string, value: string, icon: React.ReactNode, color: string, isText?: boolean }) {
  const colorMap: Record<string, string> = {
    red: "bg-red-50 text-red-600",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn("p-2 rounded-xl", colorMap[color])}>
          {icon}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">KPI</span>
      </div>
      <h4 className="text-xs font-semibold text-slate-500 mb-1">{title}</h4>
      <p className={cn(
        "font-bold text-slate-900 tracking-tight",
        isText ? "text-sm" : "text-xl"
      )}>
        {value}
      </p>
    </motion.div>
  );
}
