import React, { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

export const AlertModal = ({ isOpen, onClose, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl border border-zinc-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="text-amber-500" size={24} />
            <h3 className="text-lg font-semibold text-black tracking-tight">
              {title}
            </h3>
          </div>
          <p className="text-sm text-zinc-600 mt-2">{message}</p>
        </div>
        <div className="bg-zinc-50 px-6 py-4 flex justify-end border-t border-zinc-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  isDestructive,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl border border-zinc-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 pb-0">
          <h3 className="text-lg font-semibold text-black tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-black transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 pt-2">
          <p className="text-sm text-zinc-600">{message}</p>
        </div>
        <div className="bg-zinc-50 px-6 py-4 flex justify-end gap-3 border-t border-zinc-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 text-sm font-medium rounded-md hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white text-sm font-medium rounded-md transition-colors ${isDestructive ? "bg-red-600 hover:bg-red-700" : "bg-black hover:bg-zinc-800"}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export const PromptModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  matchText,
}) => {
  const [inputValue, setInputValue] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (inputValue === matchText) {
      onConfirm();
      setInputValue("");
    }
  };

  const handleClose = () => {
    setInputValue("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl border border-zinc-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 pb-0">
          <h3 className="text-lg font-semibold text-black tracking-tight">
            {title}
          </h3>
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-black transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 pt-2">
          <p className="text-sm text-zinc-600 mb-4">{message}</p>
          <div className="bg-red-50 text-red-800 text-xs font-mono p-3 rounded border border-red-100 mb-4">
            Please type <strong>{matchText}</strong> to confirm.
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={matchText}
            className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono"
          />
        </div>
        <div className="bg-zinc-50 px-6 py-4 flex justify-end gap-3 border-t border-zinc-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 text-sm font-medium rounded-md hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={inputValue !== matchText}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete Record
          </button>
        </div>
      </div>
    </div>
  );
};
