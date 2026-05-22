import React from 'react';

interface RegisteredBlock {
  component: React.ComponentType<any>;
  options?: Record<string, any>;
}

export class BlockRegistry {
  private _blocks: Map<string, RegisteredBlock> = new Map();
  private _fallback: React.ComponentType<any> | null = null;

  register(name: string, component: React.ComponentType<any>, options?: Record<string, any>): this {
    this._blocks.set(name, { component, options });
    return this;
  }

  get(name: string): React.ComponentType<any> | undefined {
    return this._blocks.get(name)?.component;
  }

  setFallback(component: React.ComponentType<any>): void {
    this._fallback = component;
  }

  getWithFallback(name: string): React.ComponentType<any> {
    return this._blocks.get(name)?.component || this._fallback || (() => null);
  }

  has(name: string): boolean {
    return this._blocks.has(name);
  }

  unregister(name: string): void {
    this._blocks.delete(name);
  }

  getNames(): string[] {
    return Array.from(this._blocks.keys());
  }
}

export const blockRegistry = new BlockRegistry();
