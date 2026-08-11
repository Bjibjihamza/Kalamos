# Kalamos LaTeX compilation image.
# Full TeX Live distribution including latexmk + synctex binaries.
# The server compiles projects with:
#   docker exec -w /projects/<slug> kalamos-latex latexmk ... -outdir=.build main.tex
FROM ghcr.io/xu-cheng/texlive-full:latest

COPY .docker/latexmk-wrapper /usr/local/bin/latexmk-wrapper
RUN chmod +x /usr/local/bin/latexmk-wrapper

# Keep the container alive so the server can `docker exec` into it on demand.
CMD ["sleep", "infinity"]
