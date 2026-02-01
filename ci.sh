#!/bin/bash

# --- Configuration ---
TASKS=(
    "pnpm test:run"
    "pnpm build"
    "pnpm lint"
    "pnpm format:check"
)
NUM_TASKS=${#TASKS[@]}
SYMBOL_FILLED="━"
SYMBOL_EMPTY="─"

# --- ANSI Color Definitions ---
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m';
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m';
DIM='\033[0;90m'; BOLD_CYAN='\033[1;36m'; BOLD_RED='\033[1;31m'

# --- Initialization & Cleanup ---
LOG_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'ci_log')
trap 'rm -rf "$LOG_DIR"; echo -ne "\e[?25h"' EXIT

echo -e "${BLUE}Execution Starting...${NC}"
echo -ne "\e[?25l" # Hide cursor

# 1. Initialize Task List UI
for task in "${TASKS[@]}"; do
    echo -e "${DIM}PENDING${NC}  > $task"
done

START_TIME=$SECONDS
PIDS=()

# 2. Spawn Background Tasks
for i in "${!TASKS[@]}"; do
    (
        SUB_START=$SECONDS
        # 捕获所有输出到日志文件
        eval "${TASKS[$i]}" > "$LOG_DIR/task_$i.log" 2>&1
        STATUS=$?
        echo "$STATUS" > "$LOG_DIR/status_$i"
        echo "$(( SECONDS - SUB_START ))" > "$LOG_DIR/time_$i"
        exit $STATUS
    ) &
    PIDS[$i]=$!
done

# --- UI Components ---
draw_progress_bar() {
    local completed=$1
    local width=30
    local percent=$(( completed * 100 / NUM_TASKS ))
    local filled_len=$(( completed * width / NUM_TASKS ))
    local empty_len=$(( width - filled_len ))

    local bar="${GREEN}"
    for ((j=0; j<filled_len; j++)); do bar+="$SYMBOL_FILLED"; done
    bar+="${DIM}"
    for ((j=0; j<empty_len; j++)); do bar+="$SYMBOL_EMPTY"; done

    printf "\r\033[2KProgress: [${bar}${NC}] ${BOLD_CYAN}%d%%${NC} (${completed}/${NUM_TASKS}) | Total: ${YELLOW}%ds${NC}" \
    "$percent" "$(( SECONDS - START_TIME ))"
}

# --- Main Event Loop (Polling) ---
COMPLETED_COUNT=0
FINISHED=($(for _ in "${TASKS[@]}"; do echo 0; done))

while [ "$COMPLETED_COUNT" -lt "$NUM_TASKS" ]; do
    for i in "${!PIDS[@]}"; do
        if [ "${FINISHED[$i]}" -eq 0 ] && ! kill -0 "${PIDS[$i]}" 2>/dev/null; then
            wait "${PIDS[$i]}"
            STATUS=$(cat "$LOG_DIR/status_$i")
            TASK_TIME=$(cat "$LOG_DIR/time_$i")
            FINISHED[$i]=1
            ((COMPLETED_COUNT++))

            # UI Update: Update specific task line
            UP_MOVE=$(( NUM_TASKS - i ))
            printf "\033[s\033[${UP_MOVE}A\r\033[2K"
            if [ "$STATUS" -eq 0 ]; then
                printf "${GREEN}PASSED${NC}   > ${TASKS[$i]} ${DIM}(${TASK_TIME}s)${NC}"
            else
                printf "${RED}FAILED${NC}   > ${TASKS[$i]} ${DIM}(${TASK_TIME}s)${NC}"
            fi
            printf "\033[u"
        fi
    done
    draw_progress_bar "$COMPLETED_COUNT"
    sleep 0.1
done

# --- Error Reporting (Final Phase) ---
echo -e "\n"
HAS_ERROR=false
for i in "${!TASKS[@]}"; do
    STATUS=$(cat "$LOG_DIR/status_$i")
    if [ "$STATUS" -ne 0 ]; then
        HAS_ERROR=true
        echo -e "${BOLD_RED}--- ERROR LOG: ${TASKS[$i]} ---${NC}"
        cat "$LOG_DIR/task_$i.log"
        echo -e "${DIM}-----------------------------------------${NC}\n"
    fi
done

if [ "$HAS_ERROR" = false ]; then
    echo -e "${GREEN}✔ All tasks finished successfully in $(( SECONDS - START_TIME ))s.${NC}"
else
    echo -e "${RED}✘ Some tasks failed. Review the logs above.${NC}"
    exit 1
fi
