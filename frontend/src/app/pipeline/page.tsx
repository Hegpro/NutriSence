'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import Sidebar from '@/components/Sidebar';
import { 
  GitBranch, Play, Save, AlertCircle, CheckCircle, 
  Terminal as TerminalIcon, HelpCircle, ToggleLeft, ToggleRight
} from 'lucide-react';

// React Flow
import { 
  ReactFlow, 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Custom Node Component
const CustomNode = ({ data }: any) => {
  return (
    <div className={`react-flow__node-custom w-56 relative ${!data.enabled ? 'opacity-40 border-white/5 bg-zinc-950/80!' : 'bg-[#12121c] border-purple-500/20'}`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ background: '#9333ea', border: '2px solid #242436', width: '8px', height: '8px' }} 
      />
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white">{data.label}</span>
          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-extrabold ${data.enabled ? 'bg-purple-500/10 text-purple-400' : 'bg-white/5 text-zinc-500'}`}>
            {data.enabled ? 'ACTIVE' : 'MUTED'}
          </span>
        </div>
        <p className="text-[10px] text-zinc-400 leading-normal">{data.description}</p>
      </div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ background: '#9333ea', border: '2px solid #242436', width: '8px', height: '8px' }} 
      />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode
};

export default function Pipeline() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // React Flow State
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

  // Page States
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadPipeline = async () => {
    try {
      const config = await api.getPipelineConfig();
      const parsedNodes = JSON.parse(config.nodes);
      const parsedEdges = JSON.parse(config.edges);
      
      setNodes(parsedNodes);
      setEdges(parsedEdges);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch node pipeline workspace schema.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }
    if (user && !user.is_onboarded) {
      router.push('/onboard');
      return;
    }
    if (user) {
      loadPipeline();
    }
  }, [user, authLoading, router]);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const handleNodeClick = (_e: any, node: any) => {
    setSelectedNode(node);
  };

  const toggleNodeEnabled = () => {
    if (!selectedNode) return;
    
    const updatedNodes = nodes.map((n) => {
      if (n.id === selectedNode.id) {
        const updatedData = { ...n.data, enabled: !n.data.enabled };
        // Sync selected node state
        setSelectedNode({ ...n, data: updatedData });
        return { ...n, data: updatedData };
      }
      return n;
    });
    
    setNodes(updatedNodes);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.savePipelineConfig({
        nodes: JSON.stringify(nodes),
        edges: JSON.stringify(edges)
      });
      setSuccess('LangGraph workflow configuration saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save pipeline configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setLogs(['Initiating Dry-Run Simulation...', 'Re-compiling graph workspace config...']);
    setError('');
    setSuccess('');
    try {
      const res = await api.testPipeline();
      setLogs(res.logs || ['Execution completed with no logs.']);
      if (res.errors && res.errors.length > 0) {
        setError(`Agent returned compilation errors: ${res.errors.join(', ')}`);
      } else {
        setSuccess('Simulation run completed successfully with zero validation errors!');
      }
    } catch (err: any) {
      setError(err.message || 'Execution simulation crash');
      setLogs((prev) => [...prev, `CRITICAL SYSTEM FAILURE: ${err.message}`]);
    } finally {
      setTesting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0b0b12] flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0b0b12]">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Header */}
        <header className="p-8 border-b border-white/5 flex justify-between items-center bg-[#0b0b12] shrink-0">
          <div>
            <h1 className="title-page text-white flex items-center gap-2">
              <GitBranch size={28} className="text-purple-400" />
              LangGraph Agent Pipeline Workspace
            </h1>
            <p className="text-small text-zinc-400 mt-1">Configure active nodes, toggle conditional stages, and simulate AI execution logs.</p>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="btn btn-secondary flex items-center gap-2 cursor-pointer"
            >
              {saving ? <span className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
              Save Config
            </button>
            <button 
              onClick={handleTest}
              disabled={testing}
              className="btn btn-primary flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-500/10"
            >
              {testing ? <span className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" /> : <Play size={14} />}
              Simulate Run
            </button>
          </div>
        </header>

        {/* Central Workspace: Canvas + Sidebar Panel */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* React Flow Canvas */}
          <div className="flex-1 h-full bg-[#08080f]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              onNodeClick={handleNodeClick}
              fitView
            >
              <Background color="#1a1a24" gap={18} size={1} />
              <Controls />
            </ReactFlow>
          </div>

          {/* Node Options Drawer */}
          {selectedNode ? (
            <div className="w-80 border-l border-white/5 bg-[#0d0c18] p-6 flex flex-col justify-between h-full shrink-0">
              <div className="flex flex-col gap-6">
                <div>
                  <span className="text-[10px] font-extrabold text-[#9333ea] uppercase tracking-widest">Node Settings</span>
                  <h3 className="title-card text-white mt-1.5">{selectedNode.data.label}</h3>
                  <p className="text-small text-zinc-400 mt-2 leading-relaxed">{selectedNode.data.description}</p>
                </div>

                <div className="flex flex-col gap-2 p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-zinc-300">Node Status</span>
                    <button 
                      onClick={toggleNodeEnabled}
                      className="text-purple-400 hover:text-purple-300 cursor-pointer"
                    >
                      {selectedNode.data.enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-zinc-500" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-zinc-500 leading-normal mt-1">
                    {selectedNode.data.enabled 
                      ? 'This node is active. The compiler integrates it into the execution flow.' 
                      : 'Muted. The compiler skips execution of this node.'}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => setSelectedNode(null)}
                className="btn btn-secondary w-full cursor-pointer h-[40px] flex items-center justify-center text-xs font-bold"
              >
                Close Drawer
              </button>
            </div>
          ) : (
            <div className="w-80 border-l border-white/5 bg-[#0d0c18] p-6 flex flex-col justify-center items-center text-center shrink-0 select-none">
              <HelpCircle size={32} className="text-zinc-600 mb-2" />
              <h4 className="text-xs font-bold text-white">Select a Workspace Node</h4>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-[200px] leading-relaxed">Click any node on the graph canvas to inspect its configuration and toggle its state.</p>
            </div>
          )}
        </div>

        {/* Status Messages overlay inside terminal header */}
        <div className="px-8 bg-[#0b0b12] flex flex-col gap-2">
          {error && (
            <div className="p-3 text-xs text-rose-400 bg-rose-500/10 rounded-xl border border-rose-500/20 flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 text-xs text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center gap-2">
              <CheckCircle size={14} />
              <span>{success}</span>
            </div>
          )}
        </div>

        {/* Terminal Logs Panel */}
        <div className="h-64 border-t border-white/5 bg-[#07060c] flex flex-col shrink-0">
          <div className="px-8 py-2.5 border-b border-white/5 flex justify-between items-center bg-[#09080e] select-none">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <TerminalIcon size={14} className="text-fuchsia-400" />
              System Compiler Execution Console
            </span>
            <button 
              onClick={() => setLogs([])}
              className="text-[10px] text-zinc-500 hover:text-white transition-all cursor-pointer font-bold bg-transparent p-0 border-none h-auto"
            >
              Clear Console
            </button>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto font-mono text-xs text-zinc-300 flex flex-col gap-1.5 bg-[#040409]">
            {logs.length === 0 ? (
              <span className="text-zinc-600 italic">No dry-run simulation logs recorded yet. Click "Simulate Run" above.</span>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-zinc-500">[{i+1}]</span>
                  <span className={log.includes('CRITICAL') || log.includes('error') ? 'text-rose-400 font-bold' : log.includes('Skipped') ? 'text-amber-400' : 'text-zinc-300'}>
                    {log}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
