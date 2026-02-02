import React, { useState, useEffect, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

function App() {
  const [scanResult, setScanResult] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [status, setStatus] = useState('')
  const [selectedAction, setSelectedAction] = useState(null)
  const scannerRef = useRef(null)

  useEffect(() => {
    // Initialize scanner
    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: {
        width: 250,
        height: 250,
      },
      fps: 5,
    })

    scanner.render(onScanSuccess, onScanError)
    scannerRef.current = scanner

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error('Failed to clear scanner:', error)
        })
      }
    }
  }, [])

  const decode = (str) => {
    let shifted = "";
    for (let i = 0; i < str.length; i++) {
      shifted += String.fromCharCode(str.charCodeAt(i) + 3);
    }
    return btoa(shifted);
  }

  const onScanSuccess = async (decodedText, decodedResult) => {
    setScanResult(decodedText)
    setSelectedAction(null)
    setStatus('QR Code scanned! Select entry or exit action.')
  }

  const onScanError = (errorMessage) => {
    // Handle scan error silently (this fires frequently during scanning)
  }

  const sendToBackend = async (endpoint) => {
    if (!scanResult) return

    try {
      setIsScanning(true)
      setStatus('Sending to backend...')

      // Convert scanned data to base64
      const base64Data = decode(scanResult)

      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: base64Data,
          originalData: scanResult,
          timestamp: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setStatus(`✓ ${endpoint.includes('entry') ? 'Entry' : 'Exit'} recorded successfully!`)
        console.log('Backend response:', result)
        setSelectedAction(endpoint.includes('entry') ? 'entry' : 'exit')
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.message || response.statusText

        if (endpoint.includes('entry')) {
          setStatus(`✗ Entry Error: ${errorMessage} (User may have already entered)`)
        } else {
          setStatus(`✗ Exit Error: ${errorMessage} (User may not have entered yet)`)
        }
      }
    } catch (error) {
      setStatus(`✗ Network Error: ${error.message}`)
      console.error('Error sending to backend:', error)
    } finally {
      setIsScanning(false)
    }
  }

  const handleEntry = () => {
    sendToBackend('/api/v1/qr/allow-entry')
  }

  const handleExit = () => {
    sendToBackend('/api/v1/qr/exit')
  }

  const handleReset = () => {
    setScanResult(null)
    setStatus('')
    setSelectedAction(null)
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
            QR Code Scanner
          </h1>

          {/* Scanner Area */}
          <div className="mb-6">
            <div id="reader" className="w-full"></div>
          </div>

          {/* Results Display */}
          {scanResult && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">
                  Scanned Data:
                </h3>
                <p className="text-gray-700 break-all">{scanResult}</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">
                  Base64 Encoded:
                </h3>
                <p className="text-gray-700 break-all font-mono text-sm">
                  {decode(scanResult)}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleEntry}
                  disabled={isScanning || selectedAction === 'entry'}
                  className={`py-4 px-6 rounded-lg font-semibold transition-colors ${selectedAction === 'entry'
                      ? 'bg-green-600 text-white cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                    } disabled:opacity-50`}
                >
                  {selectedAction === 'entry' ? '✓ Entry Recorded' : '🚪 Allow Entry'}
                </button>

                <button
                  onClick={handleExit}
                  disabled={isScanning || selectedAction === 'exit'}
                  className={`py-4 px-6 rounded-lg font-semibold transition-colors ${selectedAction === 'exit'
                      ? 'bg-orange-600 text-white cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                    } disabled:opacity-50`}
                >
                  {selectedAction === 'exit' ? '✓ Exit Recorded' : '🚶 Record Exit'}
                </button>
              </div>

              {status && (
                <div className={`border rounded-lg p-4 ${status.includes('✓')
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                  <p className="font-semibold">{status}</p>
                </div>
              )}

              <button
                onClick={handleReset}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Scan Another QR Code
              </button>
            </div>
          )}

          {isScanning && (
            <div className="text-center text-gray-600">
              <p className="animate-pulse">Processing request...</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-3 text-gray-800">
            Instructions:
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Allow camera access when prompted</li>
            <li>Point your camera at a QR code</li>
            <li>After scanning, click "Allow Entry" or "Record Exit"</li>
            <li>Data is sent as base64 encoded string to your backend</li>
            <li>Error messages will indicate if user already entered or didn't enter yet</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default App