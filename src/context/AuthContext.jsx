import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]             = useState(null);
  const [profile, setProfile]       = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [loading, setLoading]     = useState(true);

  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setProfile(null);
      setProfileError(null);
      return;
    }
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) {
      setProfile(null);
      setProfileError(error.message);
      return;
    }
    if (!data) {
      setProfile(null);
      setProfileError(
        "No employee profile found for this account. Contact your administrator."
      );
      return;
    }
    setProfile(data);
    setProfileError(null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const authUser = session?.user ?? null;
      setUser(authUser);
      fetchProfile(authUser).finally(() => setLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const authUser = session?.user ?? null;
        setUser(authUser);
        fetchProfile(authUser);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setProfileError(null);
  };

  const refreshProfile = () => fetchProfile(user);

  return (
    <AuthContext.Provider
      value={{ user, profile, profileError, loading, signIn, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
