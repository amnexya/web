# web
This is my website, fairly simple.

Parts of basic boilerplate code were pulled from my other project [pasted.sh](https://pasted.sh).

## Can I use this?
As stated in LICENSE, if you want to use this as a base for your own website, remove all information relating to myself, including but not limited to images, text, links, etc...

You must include a link to this repository somewhere on your website, ideally the footer, however the README on your repository also works, it just has to be publicly available.

## Docker

The website reads `/vault/plans.txt` from the `obsidian-vault` directory. Start the website with:

```sh
docker compose up --build
```

Obsidian Headless Sync is opt-in and requires an Obsidian Sync subscription. Authenticate and configure the vault once:

```sh
docker compose --profile sync run --rm obsidian login
docker compose --profile sync run --rm obsidian sync-setup --path /vault --vault "Your vault name"
docker compose --profile sync up obsidian
```

The sync service keeps the local vault updated, and the web service mounts it read-only. The Obsidian configuration is stored in the `obsidian-config` Docker volume.

## Questions?
Email je at amnexya dot com