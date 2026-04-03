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
      className={`grozl-inputbox grozl-glass w-full rounded-3xl border p-4 transition-all duration-300 ${
        isActive
          ? 'border-[#4D6BFE]/60 dark:border-[#4D6BFE]/50 shadow-lg shadow-[#4D6BFE]/10 grozl-inputbox-focused'
          : 'border-black/10 dark:border-white/10 shadow-sm'
      }`}
    >

      {/* Attached files */}
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

      {/* Textarea */}
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

      {/* Bottom bar */}
      <div className="mt-3.5 flex items-center justify-between">
        <div className="flex gap-2.5">
          {(['think', 'search'] as const).map(chip => (
            <button
              key={chip}
              onClick={() => onToggleChip(chip)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-[5px] text-[12.5px] font-medium transition-all duration-150 select-none ${
                activeChips.has(chip)
                  ? 'border-[#4D6BFE] bg-[#4D6BFE]/[0.07] text-[#4D6BFE] dark:border-[#5B7BFF] dark:bg-[#4D6BFE]/[0.10] dark:text-[#7B9FFF]'
                  : 'border-[#4D6BFE]/45 dark:border-[#4D6BFE]/40 bg-[#4D6BFE]/[0.07] dark:bg-[#4D6BFE]/[0.08] text-[#4D6BFE]/75 dark:text-[#7B9FFF]/75 active:bg-[#4D6BFE]/[0.12] dark:active:bg-[#4D6BFE]/[0.14]'
              }`}
            >
              {chip === 'think' ? (
                <svg className="h-[14px] w-[14px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
                  <path d="M9 21h6" />
                  <path d="M12 6v1" />
                  <path d="M9.5 9h5" />
                </svg>
              ) : (
                <svg className="h-[14px] w-[14px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  <path d="M2 12h20" />
                </svg>
              )}
              {chip === 'think' ? 'Think' : 'Search'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {/* Attach */}
          <button
            onClick={onToggleAttachMenu}
            className="text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition"
          >
            <Plus className="h-5 w-5" />
          </button>

          {/* Mic / Send */}
          {!hasText && attachedFiles.length === 0 ? (
            <button
              onClick={onMicClick}
              className={`transition ${
                isRecording
                  ? 'animate-pulse text-red-500'
                  : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
              }`}
            >
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={isLoading}
              className="text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Hidden inputs */}
      <input ref={cameraInputRef} type="file" className="hidden" onChange={onFileChange} />
      <input ref={photoInputRef} type="file" multiple className="hidden" onChange={onFileChange} />
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onFileChange} />
    </div>
  )
        }
