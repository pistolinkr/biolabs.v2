import React from 'react';
import { ArrowRight, Microscope, Zap, Layers, Cpu } from 'lucide-react';
import { useLocation } from 'wouter';

/**
 * Biolabs Landing Page
 * 
 * Introduction to the platform with entry points
 */
export default function Landing() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: Microscope,
      title: 'Protein Visualization',
      description: 'Advanced molecular structure viewing with AlphaFold integration',
    },
    {
      icon: Zap,
      title: 'Bio Simulation',
      description: 'Real-time molecular dynamics and interaction simulation',
    },
    {
      icon: Layers,
      title: 'Layer System',
      description: 'Photoshop-like layer management for complex molecular systems',
    },
    {
      icon: Cpu,
      title: 'Scientific HUD',
      description: 'Real-time metrics, energy calculations, and analysis tools',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-accent flex items-center justify-center">
              <Microscope size={16} className="text-accent" />
            </div>
            <h1 className="text-lg font-medium tracking-tight">BIOLABS</h1>
          </div>
          <button
            onClick={() => setLocation('/pv')}
            className="btn-compact flex items-center gap-2"
          >
            Launch
            <ArrowRight size={12} />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-24">
        <div className="max-w-3xl text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl font-bold tracking-tight">
              Next-Generation Bio Simulation
            </h2>
            <p className="text-lg text-muted-foreground">
              A computational biology operating system for structural analysis, molecular dynamics,
              and interactive protein visualization.
            </p>
          </div>

          <button
            onClick={() => setLocation('/pv')}
            className="inline-flex items-center gap-2 px-6 py-3 border border-accent text-accent hover:bg-accent hover:text-background transition-colors"
          >
            Enter PV workbench
            <ArrowRight size={16} />
          </button>

          <p className="text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => setLocation('/pv/api-tech')}
              className="border-b border-transparent text-accent hover:border-accent"
            >
              API / 인프라 레퍼런스
            </button>
            {" — "}
            BFF, NIM 경로, 환경 변수, <code className="text-[10px]">/api/ai/health</code> 라이브 요약
          </p>

          <div className="pt-8 border-t border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-8">
              Core Capabilities
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {features.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div key={idx} className="border border-border p-4 text-left">
                    <Icon size={20} className="text-accent mb-3" />
                    <h3 className="text-sm font-medium mb-1">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 py-6 text-xs text-muted-foreground flex justify-between">
          <span>Biolabs v1.0</span>
          <span>Scientific Workstation Interface</span>
        </div>
      </footer>
    </div>
  );
}
