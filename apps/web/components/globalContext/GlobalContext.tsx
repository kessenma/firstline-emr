import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';
import { getCookie, setCookie } from 'typescript-cookie'


type AutoTranslateLang = 'English' | 'Arabic' | 'Disabled';

interface GlobalContextProps {
    autoTranslateLang: AutoTranslateLang;
    updateAutoTranslateLang: (newLang: AutoTranslateLang) => void;
    telegramAutoTranslateToggle: boolean;
    updateTelegramAutoTranslateToggle: (newToggle: boolean) => void;
    isNavigating: boolean;
    setIsNavigating: (navigating: boolean) => void;
    isBottomMenuLocked: boolean;
    toggleBottomMenuLock: () => void;
}

const GlobalContext = createContext<GlobalContextProps | undefined>(undefined);

interface GlobalContextProviderProps {
    children: ReactNode;
}

export const GlobalContextProvider = ({ children }: GlobalContextProviderProps) => {
    const [autoTranslateLang, setAutoTranslateLang] = useState<AutoTranslateLang>('Disabled');
    const [telegramAutoTranslateToggle, setTelegramAutoTranslateToggle] = useState(true);
    const [isNavigating, setIsNavigating] = useState(false);
    const [isBottomMenuLocked, setIsBottomMenuLocked] = useState(false);

    useEffect(() => {
        const autoTranslateLangCookie = getCookie('autoTranslateLang');
        if (autoTranslateLangCookie) {
            setAutoTranslateLang(autoTranslateLangCookie as AutoTranslateLang);
        }

        const telegramAutoTranslateToggleCookie = getCookie('telegramAutoTranslateToggle');
        if (telegramAutoTranslateToggleCookie) {
            setTelegramAutoTranslateToggle(telegramAutoTranslateToggleCookie === 'true');
        }

        const isBottomMenuLockedCookie = getCookie('isBottomMenuLocked');
        if (isBottomMenuLockedCookie) {
            setIsBottomMenuLocked(isBottomMenuLockedCookie === 'true');
        }

    }, []);

    const updateAutoTranslateLang = (newLang: AutoTranslateLang) => {
        setAutoTranslateLang(newLang);

        setCookie('autoTranslateLang', newLang, { expires: 365 });
    };

    const updateTelegramAutoTranslateToggle = (toggle: boolean) => {
        setTelegramAutoTranslateToggle(toggle);

        setCookie('telegramAutoTranslateToggle', toggle, { expires: 365 });
    };

    const toggleBottomMenuLock = () => {
        setIsBottomMenuLocked(prev => {
            const newState = !prev;
            setCookie('isBottomMenuLocked', newState, { expires: 365 });
            return newState;
        });
    };

    return (
        <GlobalContext.Provider value={{ 
            autoTranslateLang, 
            updateAutoTranslateLang, 
            telegramAutoTranslateToggle, 
            updateTelegramAutoTranslateToggle, 
            isNavigating, 
            setIsNavigating,
            isBottomMenuLocked,
            toggleBottomMenuLock
        }}>
            { children }
        </GlobalContext.Provider>
    );
};

export const useGlobalContext = (): GlobalContextProps => {
    const context = useContext(GlobalContext);
    if (!context) {
        throw new Error('useGlobalContext must be used within a GlobalContextProvider');
    }
    return context;
};

export { GlobalContext };
