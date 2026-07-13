"use client";

import { useEffect } from "react";
import { client } from "@/lib/appwrite/client";

const AppwritePing = () => {
  useEffect(() => {
    client.ping();
  }, []);

  return null;
};

export default AppwritePing;
