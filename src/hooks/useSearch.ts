
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getSearchSuggestions, searchArtists } from '@/lib/youtube';

export interface SearchArtist {
    id: string;
    name: string;
    thumbnail: string;
    subscribers?: string;
    type: 'artist';
}

export interface SearchSuggestions {
    textSuggestions: string[];
    artists: SearchArtist[];
}

export const useSearch = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    // Initialize with URL param if valid, else empty
    const initialQuery = searchParams.get('q') || '';

    const [query, setQuery] = useState(initialQuery);
    const [suggestions, setSuggestions] = useState<SearchSuggestions>({
        textSuggestions: [],
        artists: []
    });
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const debounceRef = useRef<NodeJS.Timeout>();

    // Sync state with URL changes (handling back/forward navigation)
    useEffect(() => {
        const q = searchParams.get('q');
        if (q !== null && q !== query) {
            setQuery(q);
        } else if (q === null && query !== '') {
            setQuery('');
        }
    }, [searchParams]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.trim().length < 2) {
            setSuggestions({ textSuggestions: [], artists: [] });
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setIsLoading(true);
            try {
                // Fetch both text suggestions and artists in parallel
                const [textResults, artistResults] = await Promise.all([
                    getSearchSuggestions(query),
                    searchArtists(query, 3) // Limit to 3 artists
                ]);

                const formattedArtists: SearchArtist[] = artistResults.map((artist: any) => ({
                    id: artist.id,
                    name: artist.name,
                    thumbnail: artist.thumbnail,
                    subscribers: artist.subscribers,
                    type: 'artist' as const
                }));

                setSuggestions({
                    textSuggestions: textResults.slice(0, 5), // Limit to 5 text suggestions
                    artists: formattedArtists
                });
            } catch (error) {
                console.error("Failed to fetch suggestions", error);
                setSuggestions({ textSuggestions: [], artists: [] });
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
        navigate(`/search?q=${encodeURIComponent(term)}`);
    };

    const goToArtist = (artistId: string) => {
        setShowSuggestions(false);
        navigate(`/artist/${artistId}`);
    };

    const clear = () => {
        setQuery('');
        setSuggestions({ textSuggestions: [], artists: [] });
        setShowSuggestions(false);
    };

    const hasSuggestions = suggestions.textSuggestions.length > 0 || suggestions.artists.length > 0;

    return {
        query,
        setQuery,
        suggestions,
        hasSuggestions,
        isLoading,
        showSuggestions,
        setShowSuggestions,
        search,
        goToArtist,
        clear
    };
};
