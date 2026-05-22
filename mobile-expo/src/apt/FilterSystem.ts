type FilterCallback = (data: any, context?: Record<string, any>) => any | Promise<any>;

interface FilterEntry {
  namespace: string;
  callback: FilterCallback;
  priority: number;
}

export class FilterSystem {
  private _filters: Record<string, FilterEntry[]> = {};

  add(hookName: string, namespace: string, callback: FilterCallback, priority = 10): this {
    if (!this._filters[hookName]) {
      this._filters[hookName] = [];
    }
    this._filters[hookName].push({ namespace, callback, priority });
    this._filters[hookName].sort((a, b) => a.priority - b.priority);
    return this;
  }

  apply(hookName: string, data: any, context?: Record<string, any>): any {
    const entries = this._filters[hookName] || [];
    return entries.reduce((acc, { namespace, callback }) => {
      try {
        return callback(acc, context) ?? acc;
      } catch (err) {
        console.error(`Filter error in [${hookName}::${namespace}]:`, err);
        return acc;
      }
    }, data);
  }

  async applyAsync(hookName: string, data: any, context?: Record<string, any>): Promise<any> {
    const entries = this._filters[hookName] || [];
    let result = data;
    for (const { namespace, callback } of entries) {
      try {
        result = (await callback(result, context)) ?? result;
      } catch (err) {
        console.error(`Async filter error in [${hookName}::${namespace}]:`, err);
      }
    }
    return result;
  }

  remove(hookName: string, namespace: string): void {
    if (!this._filters[hookName]) return;
    this._filters[hookName] = this._filters[hookName].filter(f => f.namespace !== namespace);
  }
}

export const filterSystem = new FilterSystem();
export const addFilter = filterSystem.add.bind(filterSystem);
export const applyFilters = filterSystem.apply.bind(filterSystem);
export const applyFiltersAsync = filterSystem.applyAsync.bind(filterSystem);
