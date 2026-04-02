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
    <div className={`w-full rounded-3xl border p-4 shadow-sm transition-all duration-200 ${
      isActive
        ? 'border-[#4D6BFE]/60 dark:border-[#4D6BFE]/40 bg-gradient-to-b from-[#EEF2FF] to-[#F0F4FF] dark:bg-none dark:bg-[#252535] shadow-lg shadow-[#4D6BFE]/10 dark:shadow-none'
        : 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#252525]'
    }`}>

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
        className="w-full resize-none bg-transparent text-base text-gray-800 dark:text-[#ececec] outline-none placeholder:text-gray-400 dark:placeholder:text-white/30 disabled:opacity-50 [border:none] [box-shadow:none] overflow-x-hidden"
      />

      {/* Bottom bar */}
      <div className="mt-3.5 flex items-center justify-between">
        <div className="flex gap-2.5">
          {['think', 'search'].map(chip => (
            <button key={chip} onClick={() => onToggleChip(chip)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-250 ease-out capitalize ${
                activeChips.has(chip)
                  ? 'border-[#4D6BFE]/60 bg-gradient-to-r from-[#EEF2FF] to-[#F0F4FF] dark:from-[#4D6BFE]/20 dark:to-[#4D6BFE]/15 dark:bg-none text-[#4D6BFE] shadow-sm shadow-[#4D6BFE]/10'
                  : 'border-gray-200 dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.04] text-gray-500 dark:text-white/50 hover:border-gray-300 dark:hover:border-white/[0.14] hover:bg-white dark:hover:bg-white/[0.07] hover:text-gray-600 dark:hover:text-white/70 hover:shadow-sm'
              }`}
            >
              {chip === 'think' ? (
                <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
                  <path d="M9 21h6" /><path d="M12 6v1" /><path d="M9.5 9h5" />
                </svg>
              ) : (
                <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  <path d="M2 12h20" />
                </svg>
              )}
              {chip}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {/* Attach menu */}
          <div className="relative">
            {showAttachMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={onCloseAttachMenu} />
                <div className="absolute bottom-9 right-0 z-50 w-[160px] overflow-hidden rounded-2xl border border-gray-100 dark:border-white/[0.08] bg-white dark:bg-[#212121] shadow-2xl">
                  {[
                    { label: 'Camera', ref: cameraInputRef, icon: <Camera className="h-5 w-5" /> },
                    { label: 'Photos', ref: photoInputRef,  icon: <Image className="h-5 w-5" /> },
                    { label: 'Files',  ref: fileInputRef,   icon: <FileText className="h-5 w-5" /> },
                  ].map((item, idx, arr) => (
                    <button key={item.label} onClick={() => { item.ref.current?.click(); onCloseAttachMenu() }}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-[14px] font-medium text-gray-700 dark:text-[#ececec] transition hover:bg-indigo-50 dark:hover:bg-white/[0.07] hover:text-indigo-600 dark:hover:text-white/80 ${idx < arr.length - 1 ? 'border-b border-gray-100 dark:border-white/[0.07]' : ''}`}
                    >
                      {item.icon} {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button onClick={onToggleAttachMenu} className="text-gray-500 dark:text-white/50 transition hover:text-gray-700 dark:hover:text-white/70">
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* Mic / Send */}
          {!hasText && attachedFiles.length === 0 ? (
            <button onClick={onMicClick} className={`transition ${isRecording ? 'animate-pulse text-red-500' : 'text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70'}`}>
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          ) : (
            <button onClick={onSend} disabled={isLoading} className="text-indigo-600 dark:text-indigo-400 transition hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />
      <input ref={photoInputRef}  type="file" accept="image/*" multiple className="hidden" onChange={onFileChange} />
      <input ref={fileInputRef}   type="file" multiple className="hidden" onChange={onFileChange} />
    </div>
  )
      }
              
