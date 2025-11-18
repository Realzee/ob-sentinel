'use client';

interface LocationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: string;
  title?: string;
}

export default function LocationPreviewModal({
  isOpen,
  onClose,
  location,
  title = 'Location Preview'
}: LocationPreviewModalProps) {
  if (!isOpen) return null;

  // Extract coordinates if location is in "lat, lng" format
  const isCoordinates = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(location);
  let mapUrl = '';

  if (isCoordinates) {
    const [lat, lng] = location.split(',').map(coord => coord.trim());
    mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${Number(lng)-0.01}%2C${Number(lat)-0.01}%2C${Number(lng)+0.01}%2C${Number(lat)+0.01}&layer=mapnik&marker=${lat}%2C${lng}`;
  } else {
    // For address, use search
    mapUrl = `https://www.openstreetmap.org/export/embed.html?q=${encodeURIComponent(location)}&layer=mapnik&marker=`;
  }

  const openInMaps = () => {
    if (isCoordinates) {
      const [lat, lng] = location.split(',').map(coord => coord.trim());
      window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`, '_blank');
    } else {
      window.open(`https://www.openstreetmap.org/search?query=${encodeURIComponent(location)}`, '_blank');
    }
  };

  const shareLocation = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Incident Location',
          text: `Location: ${location}`,
          url: isCoordinates 
            ? `https://www.openstreetmap.org/?mlat=${location.split(',')[0]}&mlon=${location.split(',')[1]}#map=16/${location}`
            : `https://www.openstreetmap.org/search?query=${encodeURIComponent(location)}`
        });
      } catch (error) {
        console.log('Sharing cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(location).then(() => {
        alert('Location copied to clipboard!');
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-black bg-opacity-75" 
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="relative inline-block w-full max-w-4xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl sm:my-8 sm:align-middle sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">{title}</h2>
              <p className="text-gray-400 mt-1">{location}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Map Preview */}
          <div className="mb-6 bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
            <iframe
              width="100%"
              height="400"
              frameBorder="0"
              scrolling="no"
              marginHeight={0}
              marginWidth={0}
              src={mapUrl}
              className="border-0"
            />
          </div>

          {/* Location Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700">
            <button
              onClick={openInMaps}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>Open in Maps</span>
            </button>
            
            <button
              onClick={shareLocation}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>Share Location</span>
            </button>

            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}