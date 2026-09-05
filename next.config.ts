import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const next_config: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

const with_next_intl = createNextIntlPlugin();

export default with_next_intl(next_config);
