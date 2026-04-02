'use client'

import { Plus, Mic, MicOff, Send, Camera, Image, FileText, Loader2 } from 'lucide-react'

interface InputBoxProps {
  inputValue: string
  isRecording: boolean
  isLoading: boolean
  attachedFiles: File[]
  activeChips: Set<string>
  isFocused: boolean
  showAttachMenu: boolean
  textareaRef: React.RefObject<HTMLTextAreaElement>
  cameraInputRef: React.RefObject<HTMLInputElement>
  photoInputRef: React.RefObject<HTMLInputElement>
  fileInputRef: React.RefObject<HTMLInputElement>
  onInput: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  onMicClick: () => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: (index: number) => void
  onToggleChip: (chip: string) => void
  onFocus: () => void
  onBlur: () => void
  onToggleAttachMenu: () => void
  onCloseAttachMenu: () => void
}

export default function InputBox({
  inputValue, isRecording, isLoading, attachedFiles, activeChips,
  isFocused, showAttachMenu, textareaRef, cameraInputRef, photoInputRef, fileInputRef,
  onInput, onSend, onMicClick, onFileChange, onRemoveFile, onToggleChip,
  onFocus, onBlur, onToggleAttachMenu, onCloseAttachMenu,
}: InputBoxProps) {
  const hasText  = inputValue.trim().length > 0
  const isActive = isFocused || hasText || attachedFiles.length > 0

  return (
    <div
      className={`grozl-inputbox grozl-glass w-full rounded-3xl border p-4 transition-all duration-200 ${
        isActive
          ? 'border-[#4D6BFE]/60 dark:border-[#4D6BFE]/40 shadow-lg shadow-[#4D6BFE]/10'
          : 'border-black/10 dark:border-white/10 shadow-sm'
      }`}
    >

      {attachedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachedFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-xl border border-indigo-100 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/20 px-3 py-1.5 text-[13px] text-indigo-700 dark:text-indigo-300">
              {file.type.startsWith('image/') ? <Image className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
              <span className="max-w-[120px] truncate">{file.name}</span>
              <button onClick={() => onRemoveFile(i)} className="ml-1 opacity-50 hover:opacity-100">✕</button>
            </div>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        placeholder={isRecording ? 'Grozl Is Listening...' : 'Ask Grozl anything...'}
        rows={1}
        value={inputValue}
        onChange={onInput}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={isLoading}
        className="w-full resize-none bg-transparent text-base text-gray-800 dark:text-[#ececec] outline-none placeholder:text-gray-400 dark:placeholder:text-white/30 disabled:opacity-50 overflow-x-hidden"
      />

      <div className="mt-3.5 flex items-center justify-between">
        <div className="flex gap-2.5">
          {['think', 'search'].map(chip => (
            <button
              key={chip}
              onClick={() => onToggleChip(chip)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition-all ${
                activeChips.has(chip)
                  ? 'border-[#4D6BFE]/60 bg-[#EEF2FF] dark:bg-[#4D6BFE]/20 text-[#4D6BFE]'
                  : 'border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-white/50'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button onClick={onToggleAttachMenu} className="text-gray-500 dark:text-white/50">
            <Plus className="h-5 w-5" />
          </button>

          {!hasText && attachedFiles.length === 0 ? (
            <button onClick={onMicClick}>
              {isRecording ? <MicOff className="h-5 w-5 text-red-500" /> : <Mic className="h-5 w-5" />}
            </button>
          ) : (
            <button onClick={onSend} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      <input ref={cameraInputRef} type="file" className="hidden" onChange={onFileChange} />
      <input ref={photoInputRef} type="file" multiple className="hidden" onChange={onFileChange} />
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onFileChange} />
    </div>
  )
              }
