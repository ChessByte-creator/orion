import { useEffect, useState } from "react";
import { useOrion } from "@/components/orion/orion-context";
import { loadFolderTree } from "@/lib/orion/api";
import type { FolderNode } from "@/lib/orion/types";

export function useFolderTree(active: boolean) {
  const { adminToken, folderTick } = useOrion();
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancel = false;
    setLoading(true);
    void loadFolderTree(adminToken).then((res) => {
      if (cancel) return;
      setFolders(res.folders);
      setError(res.error ?? null);
      setLoading(false);
    });
    return () => {
      cancel = true;
    };
  }, [active, adminToken, folderTick]);

  return { folders, error, loading };
}
