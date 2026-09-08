import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [is_mobile, set_is_mobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const on_change = () => {
      set_is_mobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", on_change);
    set_is_mobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", on_change);
  }, []);

  return !!is_mobile;
}
