// apps/web/components/telegram-patient/container/intake-form/ErrorModal.jsx

import React from 'react';

const ErrorModal = ({ errorMessage, onClose }) => {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-background/50">
            <div className="bg-card p-6 rounded shadow-lg max-w-sm">
                <h2 className="text-xl font-bold mb-4 text-destructive">Error</h2>
                <p className="text-destructive">{errorMessage}</p>
                <div className="flex justify-end mt-4">
                    <button
                        className="px-4 py-2 bg-destructive text-destructive-foreground rounded"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ErrorModal;