interface Props {
  status: string;
  conflict: boolean;
  onSync: () => void;
  onResolve: () => void;
}

export function SyncBar({ status, conflict, onSync, onResolve }: Props) {
  return (
    <div className="card sync-card" role="status">
      <span>{status}</span>
      <div className="sync-actions">
        <button type="button" className="tiny" onClick={onSync}>
          Sync now
        </button>
        {conflict && (
          <button type="button" className="tiny" onClick={onResolve}>
            Resolve conflict
          </button>
        )}
      </div>
    </div>
  );
}
