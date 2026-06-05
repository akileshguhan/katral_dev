using System.Security.Cryptography;
using System.Text;

namespace EduPlatform.Api.Services;

public static class TotpService
{
    private const int Step = 30;
    private const int Digits = 6;
    private const int Window = 1;

    private static readonly string Base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    public static string GenerateSecret()
    {
        var bytes = RandomNumberGenerator.GetBytes(20);
        return Base32Encode(bytes);
    }

    public static string GetOtpAuthUri(string secret, string email, string issuer = "Kattral Academy")
    {
        var enc = Uri.EscapeDataString(issuer);
        var acc = Uri.EscapeDataString(email);
        return $"otpauth://totp/{enc}:{acc}?secret={secret}&issuer={enc}&algorithm=SHA1&digits={Digits}&period={Step}";
    }

    public static bool Verify(string secret, string code)
    {
        if (string.IsNullOrWhiteSpace(code) || code.Length != Digits) return false;
        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds() / Step;
        for (var i = -Window; i <= Window; i++)
        {
            if (Compute(secret, ts + i) == code) return true;
        }
        return false;
    }

    private static string Compute(string secret, long counter)
    {
        var key = Base32Decode(secret);
        var counterBytes = BitConverter.GetBytes(counter);
        if (BitConverter.IsLittleEndian) Array.Reverse(counterBytes);
        using var hmac = new HMACSHA1(key);
        var hash = hmac.ComputeHash(counterBytes);
        var offset = hash[^1] & 0x0F;
        var code = (((hash[offset] & 0x7F) << 24)
                  | ((hash[offset + 1] & 0xFF) << 16)
                  | ((hash[offset + 2] & 0xFF) << 8)
                  | (hash[offset + 3] & 0xFF)) % 1_000_000;
        return code.ToString("D6");
    }

    private static string Base32Encode(byte[] data)
    {
        var sb = new StringBuilder();
        for (int i = 0; i < data.Length; i += 5)
        {
            var chunk = new byte[5];
            var len = Math.Min(5, data.Length - i);
            Array.Copy(data, i, chunk, 0, len);
            sb.Append(Base32Chars[(chunk[0] >> 3) & 0x1F]);
            sb.Append(Base32Chars[((chunk[0] << 2) | (chunk[1] >> 6)) & 0x1F]);
            if (len < 2) break;
            sb.Append(Base32Chars[(chunk[1] >> 1) & 0x1F]);
            sb.Append(Base32Chars[((chunk[1] << 4) | (chunk[2] >> 4)) & 0x1F]);
            if (len < 3) break;
            sb.Append(Base32Chars[((chunk[2] << 1) | (chunk[3] >> 7)) & 0x1F]);
            if (len < 4) break;
            sb.Append(Base32Chars[(chunk[3] >> 2) & 0x1F]);
            sb.Append(Base32Chars[((chunk[3] << 3) | (chunk[4] >> 5)) & 0x1F]);
            if (len < 5) break;
            sb.Append(Base32Chars[chunk[4] & 0x1F]);
        }
        return sb.ToString();
    }

    private static byte[] Base32Decode(string input)
    {
        input = input.ToUpperInvariant().TrimEnd('=');
        var bits = input.Length * 5;
        var bytes = new byte[bits / 8];
        int bitsUsed = 0, byteIdx = 0;
        int buffer = 0;
        foreach (var c in input)
        {
            var val = Base32Chars.IndexOf(c);
            if (val < 0) continue;
            buffer = (buffer << 5) | val;
            bitsUsed += 5;
            if (bitsUsed >= 8)
            {
                bytes[byteIdx++] = (byte)(buffer >> (bitsUsed - 8));
                bitsUsed -= 8;
            }
        }
        return bytes;
    }
}
