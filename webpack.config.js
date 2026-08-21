import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
	entry: "./src/client/main.ts",
	output: {
		path: path.join(dirname, "public"),
		filename: "bundle.js",
	},
	resolve: {
		extensions: [".ts", ".js"],
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				exclude: /node_modules/,
				use: {
					loader: "ts-loader",
					options: {
						configFile: "tsconfig.client.json",
						transpileOnly: true,
					},
				},
			},
		],
	},
};
