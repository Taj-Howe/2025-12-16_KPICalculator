"use client";

type WorkspaceViewOption<T extends string> = {
  id: T;
  label: string;
  description: string;
};

type WorkspaceViewSelectorProps<T extends string> = {
  activeView: T;
  options: WorkspaceViewOption<T>[];
  onSelect: (view: T) => void;
};

const WorkspaceViewSelector = <T extends string>({
  activeView,
  options,
  onSelect,
}: WorkspaceViewSelectorProps<T>) => {
  return (
    <nav
      aria-label="Workspace views"
      className="panel-shell rounded-[24px] p-2"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isActive = option.id === activeView;
          return (
            <button
              key={option.id}
              type="button"
              data-selected={isActive}
              onClick={() => onSelect(option.id)}
              className="choice-card rounded-[18px] px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-white">
                  {option.label}
                </span>
                <span
                  className={`h-2.5 w-2.5 rounded-full border transition-colors ${
                    isActive
                      ? "border-white bg-white"
                      : "border-white/22 bg-transparent"
                  }`}
                />
              </div>
              <p className="mt-1 text-xs text-white/52">{option.description}</p>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default WorkspaceViewSelector;
