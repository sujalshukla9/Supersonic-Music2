
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getSearchSuggestions } from '@/lib/youtube';

export const useSearch = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    // Initialize with URL param if valid, else empty
    const initialQuery = searchParams.get('q') || '';

    const [query, setQuery] = useState(initialQuery);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const debounceRef = useRef<NodeJS.Timeout>();

    // Sync state with URL changes (handling back/forward navigation)
    useEffect(() => {
        const q = searchParams.get('q');
        if (q !== null && q !== query) {
            setQuery(q);
        } else if (q === null && query !== '') {
            // Only clear if we navigated effectively to a non-search page (though typical use case is we stay on header)
            // Actually, if we navigate to Home, q is null. We might want to clear the search bar or keep it?
            // Usually, 'logical' means if I go home, search bar clears.
            setQuery('');
        }
    }, [searchParams]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.trim().length < 2) {
            setSuggestions([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setIsLoading(true);
            try {
                const results = await getSearchSuggestions(query);
                setSuggestions(results.slice(0, 8)); // Limit to 8
            } catch (error) {
                console.error("Failed to fetch suggestions", error);
                setSuggestions([]);
            } finally {
                setIsLoading(false);
            }
        }, 300); // 300ms debounce

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    const search = (term: string) => {
        if (!term.trim()) return;
        setShowSuggestions(false);
        // encodeURIComponent is important
        navigate(`/search?q=${encodeURIComponent(term)}`);
    };

    const clear = () => {
        setQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
        // Optional: clear URL if on search page? Maybe not.
    };

    return {
        query,
        setQuery,
        suggestions,
        isLoading,
        showSuggestions,
        setShowSuggestions,
        search,
        clear
    };
};
