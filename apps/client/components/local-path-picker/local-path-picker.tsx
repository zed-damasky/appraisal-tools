"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import {
  Folder,
  HardDrive,
  Check,
  Loader2,
  FolderPlus,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

interface LocalPathPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (path: string) => void;
}

export function LocalPathPicker({
  open,
  onOpenChange,
  onSelect,
}: LocalPathPickerProps) {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("");
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [drives, setDrives] = useState<string[]>([]);
  const [loadingDrives, setLoadingDrives] = useState(false);

  useEffect(() => {
    if (currentPath) {
      setInputValue(currentPath);
    } else {
      setInputValue("");
    }
    setSelectedPath("");
  }, [currentPath]);

  useEffect(() => {
    if (selectedPath) {
      setInputValue(selectedPath);
    } else if (currentPath) {
      setInputValue(currentPath);
    }
  }, [selectedPath, currentPath]);

  useEffect(() => {
    if (open && !currentPath && drives.length === 0) {
      loadDrives();
    }
  }, [open, currentPath, drives.length]);

  const loadDrives = async () => {
    setLoadingDrives(true);
    try {
      const data = await api.filesystem.getDrives();
      setDrives(data.drives || []);
    } catch (e) {
      toast.error("Не удалось получить список дисков");
    } finally {
      setLoadingDrives(false);
    }
  };

  const loadDirectory = async (path: string) => {
    setLoading(true);
    try {
      const data = await api.filesystem.list(path);
      setEntries(data.entries || []);
      setCurrentPath(path);
    } catch (e: any) {
      toast.error(e.message || "Ошибка чтения папки");
    } finally {
      setLoading(false);
    }
  };

  const handlePathSubmit = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const pathToLoad = inputValue.trim();
      if (pathToLoad) {
        loadDirectory(pathToLoad);
      }
    }
  };

  const handleSelectItem = (path: string) => {
    setSelectedPath(path);
  };

  const handleOpenItem = (path: string) => {
    loadDirectory(path);
  };

  const handleConfirmSelection = () => {
    const pathToSelect = selectedPath || currentPath;
    if (!pathToSelect) return;

    onSelect(pathToSelect);
    onOpenChange(false);
  };

  const goUp = () => {
    if (!currentPath) return;

    const cleanPath = currentPath.endsWith("\\")
      ? currentPath.slice(0, -1)
      : currentPath;

    const parts = cleanPath.split("\\");

    if (parts.length <= 2 && parts[0].endsWith(":")) {
      setCurrentPath("");
      setEntries([]);
    } else {
      parts.pop();
      const parentPath = parts.join("\\") + "\\";
      loadDirectory(parentPath);
    }
  };

  const handleCreateFolder = async () => {
    const folderName = prompt("Введите имя новой папки:");
    if (!folderName) return;

    if (!currentPath) {
      toast.error("Сначала выберите диск или папку");
      return;
    }

    try {
      const newPath = `${currentPath}${currentPath.endsWith("\\") ? "" : "\\"}${folderName}`;
      await api.filesystem.makeDirectory(newPath);
      toast.success("Папка создана");
      loadDirectory(currentPath);
    } catch (e: any) {
      toast.error(e.message || "Ошибка создания папки");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-150 flex flex-col">
        <DialogHeader>
          <DialogTitle>Выберите папку для отчёта</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col border rounded-md mt-4 bg-background">
          {/* Панель навигации */}
          <div className="p-2 bg-muted/50 border-b flex items-center gap-2">
          {/* перекидывает в начало на диски,  нужно в предыдущую папку, еще нужно кнопку добавить вверх 
            сохранение состояния до
            парсинг пути и переход на уровень выше
          */}
            <Button
              variant="ghost"
              size="icon"
              onClick={goUp}
              disabled={!currentPath}
              title="Назад" 
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handlePathSubmit}
              placeholder="Введите путь и нажмите Enter"
              className="h-8 font-mono text-sm"
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={handleCreateFolder}
              disabled={!currentPath}
              title="Создать папку"
            >
              <FolderPlus className="h-4 w-4 text-green-600" />
            </Button>
          </div>

          {/* Список файлов/папок */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !currentPath ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
                {loadingDrives ? (
                  <p className="col-span-full text-center text-muted-foreground">
                    Загрузка дисков...
                  </p>
                ) : (
                  drives.map((drive) => (
                    <Button
                      key={drive}
                      variant="outline"
                      className={`justify-start h-12 ${
                        selectedPath === drive
                          ? "bg-blue-100 border-blue-500"
                          : ""
                      }`}
                      onClick={() => handleSelectItem(drive)}
                      onDoubleClick={() => handleOpenItem(drive)}
                    >
                      <HardDrive className="mr-2 h-4 w-4 text-blue-500" />
                      {drive}
                    </Button>
                  ))
                )}
              </div>
            ) : (
              <>
                {entries.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Папка пуста
                  </p>
                )}

                {entries.map(
                  (entry) =>
                    entry.isDirectory && (
                      <Button
                        key={entry.path}
                        variant="ghost"
                        className={`w-full justify-start h-10 hover:bg-accent/20 ${
                          selectedPath === entry.path
                            ? "bg-blue-100 text-blue-900"
                            : ""
                        }`}
                        onClick={() => handleSelectItem(entry.path)}
                        onDoubleClick={() => handleOpenItem(entry.path)}
                      >
                        <Folder className="mr-2 h-4 w-4 text-yellow-500" />
                        <span className="truncate">{entry.name}</span>
                      </Button>
                    ),
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleConfirmSelection}
            disabled={(!currentPath && !selectedPath) || loading}
          >
            Выбрать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
