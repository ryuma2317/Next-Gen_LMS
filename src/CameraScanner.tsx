import { useEffect, useRef, useState } from 'react'
import { parseAttendanceQr } from '../shared/attendance'

export function CameraScanner({ onRead, onClose }: {
  onRead: (value: { sessionId: string; code: string }) => void
  onClose: () => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const callback = useRef(onRead)
  const [message, setMessage] = useState('Allow camera access and point it at the trainer’s QR.')
  callback.current = onRead
  useEffect(() => {
    let disposed = false, handled = false
    let stop: (() => void) | undefined
    async function start() {
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser')
        if (disposed || !video.current) return
        const reader = new BrowserQRCodeReader()
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } }, audio: false },
          video.current,
          (result, _error, controls) => {
            if (!result || disposed || handled) return
            try {
              const data = parseAttendanceQr(result.getText())
              handled = true
              controls.stop()
              callback.current(data)
            } catch { setMessage('That is not a Next-Gen attendance QR. Use the trainer’s display.') }
          },
        )
        stop = () => controls.stop()
        if (disposed) controls.stop()
      } catch {
        if (!disposed) setMessage('Camera unavailable or permission denied. Close the camera and enter the displayed code instead.')
      }
    }
    void start()
    return () => { disposed = true; stop?.() }
  }, [])
  return <section className="camera-panel" aria-label="Attendance QR scanner">
    <video ref={video} playsInline muted aria-label="Camera preview" />
    <p role="status">{message}</p>
    <button className="secondary-button" onClick={onClose}>Stop camera</button>
  </section>
}
