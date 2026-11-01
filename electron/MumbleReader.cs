using System;
using System.IO;
using System.IO.MemoryMappedFiles;
using System.Text;
using System.Threading;

namespace Omnitria.Mumble {
    class Program {
        static void Main(string[] args) {
            Console.OutputEncoding = Encoding.UTF8;
            MemoryMappedFile mmf = null;
            MemoryMappedViewAccessor accessor = null;
            uint lastTick = 0;
            DateTime lastTickChange = DateTime.MinValue;
            bool wasConnected = false;

            // Optional one-shot mode for tests
            bool oneShot = args.Length > 0 && args[0] == "--one-shot";

            while (true) {
                try {
                    if (mmf == null) {
                        // CreateOrOpen is required by GW2 MumbleLink specification:
                        // GW2 only opens the existing mapping created by Mumble/overlays.
                        mmf = MemoryMappedFile.CreateOrOpen("MumbleLink", 5460, MemoryMappedFileAccess.ReadWrite);
                        accessor = mmf.CreateViewAccessor(0, 5460, MemoryMappedFileAccess.Read);
                    }

                    uint uiVersion = accessor.ReadUInt32(0);
                    uint uiTick = accessor.ReadUInt32(4);

                    if (uiTick > 0) {
                        if (uiTick != lastTick) {
                            lastTick = uiTick;
                            lastTickChange = DateTime.UtcNow;

                            byte[] idBytes = new byte[512];
                            accessor.ReadArray(592, idBytes, 0, 512);
                            string rawId = Encoding.Unicode.GetString(idBytes);
                            int nullIdx = rawId.IndexOf('\0');
                            string identity = (nullIdx >= 0 ? rawId.Substring(0, nullIdx) : rawId).Trim();
                            int lastBrace = identity.LastIndexOf('}');
                            if (identity.StartsWith("{") && lastBrace >= 0) {
                                identity = identity.Substring(0, lastBrace + 1);
                            }

                            uint mapId = accessor.ReadUInt32(1136);
                            uint mapType = accessor.ReadUInt32(1140);
                            uint shardId = accessor.ReadUInt32(1144);
                            uint instance = accessor.ReadUInt32(1148);
                            uint buildId = accessor.ReadUInt32(1152);
                            uint uiState = accessor.ReadUInt32(1156);
                            ushort compassWidth = accessor.ReadUInt16(1160);
                            ushort compassHeight = accessor.ReadUInt16(1162);
                            float compassRotation = accessor.ReadSingle(1164);
                            float playerX = accessor.ReadSingle(1168);
                            float playerY = accessor.ReadSingle(1172);

                            bool isMapOpen = (uiState & 0x01) != 0;
                            bool isCompassTopRight = (uiState & 0x02) != 0;
                            bool doesCompassHaveRotation = (uiState & 0x04) != 0;
                            bool gameHasFocus = (uiState & 0x08) != 0;
                            bool isInCompetitiveMode = (uiState & 0x10) != 0;
                            bool textboxHasFocus = (uiState & 0x20) != 0;
                            bool isInCombat = (uiState & 0x40) != 0;

                            string safeId = string.IsNullOrEmpty(identity) || !identity.StartsWith("{") ? "{}" : identity;

                            Console.WriteLine("{{\"connected\":true,\"tick\":{0},\"mapId\":{1},\"mapType\":{2},\"shardId\":{3},\"instance\":{4},\"buildId\":{5},\"uiState\":{6},\"isMapOpen\":{7},\"isInCombat\":{8},\"gameHasFocus\":{9},\"compassWidth\":{10},\"compassHeight\":{11},\"compassRotation\":{12},\"playerX\":{13},\"playerY\":{14},\"identity\":{15}}}",
                                uiTick,
                                mapId,
                                mapType,
                                shardId,
                                instance,
                                buildId,
                                uiState,
                                isMapOpen ? "true" : "false",
                                isInCombat ? "true" : "false",
                                gameHasFocus ? "true" : "false",
                                compassWidth,
                                compassHeight,
                                compassRotation.ToString(System.Globalization.CultureInfo.InvariantCulture),
                                playerX.ToString(System.Globalization.CultureInfo.InvariantCulture),
                                playerY.ToString(System.Globalization.CultureInfo.InvariantCulture),
                                safeId
                            );
                            Console.Out.Flush();
                            wasConnected = true;
                        } else if (wasConnected && (DateTime.UtcNow - lastTickChange).TotalSeconds > 4.0) {
                            // Ticks stopped incrementing for > 4s -> game exited or paused
                            Console.WriteLine("{\"connected\":false}");
                            Console.Out.Flush();
                            wasConnected = false;
                        }
                    } else {
                        // uiTick is 0 -> game hasn't initialized / written yet
                        if (wasConnected || oneShot) {
                            Console.WriteLine("{\"connected\":false}");
                            Console.Out.Flush();
                            wasConnected = false;
                        }
                    }

                    if (oneShot) break;
                    Thread.Sleep(50);
                }
                catch (Exception) {
                    if (wasConnected || oneShot) {
                        Console.WriteLine("{\"connected\":false}");
                        Console.Out.Flush();
                        wasConnected = false;
                    }
                    if (accessor != null) { accessor.Dispose(); accessor = null; }
                    if (mmf != null) { mmf.Dispose(); mmf = null; }
                    if (oneShot) break;
                    Thread.Sleep(1000);
                }
            }
        }
    }
}
