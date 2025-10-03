import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DebugLog {
  timestamp: string;
  type: 'info' | 'error' | 'success' | 'warning';
  message: string;
  data?: any;
}

interface DebugPanelProps {
  logs: DebugLog[];
  onClear?: () => void;
}

export function DebugPanel({ logs, onClear }: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error': return 'bg-red-100 text-red-800 border-red-300';
      case 'success': return 'bg-green-100 text-green-800 border-green-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error': return '❌';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  if (logs.length === 0) return null;

  return (
    <Card className="mt-4 border-2 border-purple-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">🔧 Debug Panel</CardTitle>
            <Badge variant="outline">{logs.length} záznamů</Badge>
          </div>
          <div className="flex gap-2">
            {onClear && (
              <Button size="sm" variant="outline" onClick={onClear}>
                Vymazat
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`p-3 rounded border ${getTypeColor(log.type)}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">{getTypeIcon(log.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono opacity-70">
                        {log.timestamp}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {log.type}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mb-1">{log.message}</p>
                    {log.data && (
                      <pre className="text-xs bg-black/10 p-2 rounded mt-2 overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Hook pro snadné používání debug panelu
export function useDebugLogs() {
  const [logs, setLogs] = useState<DebugLog[]>([]);

  const addLog = (type: DebugLog['type'], message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString('cs-CZ');
    setLogs(prev => [...prev, { timestamp, type, message, data }]);
  };

  const clearLogs = () => setLogs([]);

  return { logs, addLog, clearLogs };
}

