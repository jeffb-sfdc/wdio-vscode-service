import { QuickOpenBox } from "./QuickOpenBox";
import clipboard from 'clipboardy';
import { IPluginDecorator, BasePage, PluginDecorator } from '../../utils'
import { input } from 'locators/1.61.0'

/**
 * Abstract page object for input fields
 */
export interface Input extends IPluginDecorator<typeof input.Input> {}
export abstract class Input extends BasePage {

    /**
     * Get current text of the input field
     * @returns Promise resolving to text of the input field
     */
    async getText(): Promise<string> {
        const input = await this.inputBox$.$(this.locators.input);
        return input.getAttribute('value');
    }

    /**
     * Set (by selecting all and typing) text in the input field
     * @param text text to set into the input field
     * @returns Promise resolving when the text is typed in
     */
    async setText(text: string): Promise<void> {
        const input = await this.inputBox$.$(this.locators.input);
        await this.clear();
        await new Promise(res => setTimeout(res, 200));
        if ((await this.getText()).length > 0) {
            await input.addValue(['End', 'Shift', 'Home']);
        }
        await input.addValue(text);

        // fallback to clipboard if the text gets malformed
        if ((await this.getText()) !== text) {
            await clipboard.write(text);
            await input.addValue(['End'])
            await input.addValue(['Shift', 'Home']);
            await input.addValue(['Control', 'v']);
            await clipboard.write('');
        }
    }

    /**
     * Get the placeholder text for the input field
     * @returns Promise resolving to input placeholder
     */
    async getPlaceHolder(): Promise<string> {
        return this.inputBox$.$(this.locators.input).getAttribute('placeholder');
    }

    /**
     * Confirm the input field by pressing Enter
     * @returns Promise resolving when the input is confirmed
     */
    async confirm(): Promise<void> {
        const input = this.inputBox$.$(this.locators.input);
        await input.click();
        await input.addValue(['Enter']);
    }

    /**
     * Cancel the input field by pressing Escape
     * @returns Promise resolving when the input is cancelled
     */
    async cancel(): Promise<void> {
        await this.inputBox$.$(this.locators.input).addValue(['Escape']);
    }

    /**
     * Clear the inpur field
     * @returns Promise resolving when the field is cleared
     */
    async clear(): Promise<void> {
        const input = await this.inputBox$.$(this.locators.input);
        // VS Code 1.40 breaks the default clear method, use select all + back space instead
        await input.addValue(['End'])
        await input.addValue(['Shift', 'Home'])
        await input.addValue(['Backspace'])
        if ((await input.getAttribute('value')).length > 0) {
            await input.addValue(['End'])
            await input.addValue(['Shift', 'Home'])
            await input.addValue(['Backspace'])
        }
    }

    /**
     * Select (click) a quick pick option. Will scroll through the quick picks to find the item.
     * Search for the item can be done by its text, or index in the quick pick menu.
     * Note that scrolling does not affect the item's index, but it will
     * replace some items in the DOM (thus they become unreachable)
     * 
     * @param indexOrText index (number) or text (string) of the item to search by
     * @returns Promise resolving when the given quick pick is selected
     */
    async selectQuickPick(indexOrText: string | number): Promise<void> {
        const pick = await this.findQuickPick(indexOrText);
        if (pick) {
            await pick.select();
        } else {
            await this.resetPosition();
        }
    }

    /**
     * Select/Deselect all quick picks using the 'select all' checkbox
     * If multiple selection is disabled on the input box, no action is performed
     * 
     * @param state true to select all, false to deselect all
     * @returns Promise resolving when all quick picks have been toggled to desired state
     */
    async toggleAllQuickPicks(state: boolean): Promise<void> {
        const checkboxes = await this.quickPickSelectAll$$;
        if (checkboxes.length < 0) {
            return;
        }
        if (!await checkboxes[0].isSelected()) {
            await checkboxes[0].click();
        }
        if (state === false) {
            await checkboxes[0].click();
        }
    }

    /**
     * Scroll through the quick picks to find an item by the name or index
     * @param indexOrText index (number) or text (string) of the item to search by
     * @returns Promise resolvnig to QuickPickItem if found, to undefined otherwise
     */
    async findQuickPick(indexOrText: string | number): Promise<QuickPickItem | undefined> {
        const input = await this.inputBox$.$(this.locators.input);
        const first = await this.quickPickPosition$$(1);
        if (first.length < 1) {
            await this.resetPosition();
        }
        let endReached = false;

        while(!endReached) {
            const picks = await this.getQuickPicks();
            for (const pick of picks) {
                const lastRow = await this.elem.$$(this.locatorMap.sideBar.DefaultTreeSection.lastRow);
                if (lastRow.length > 0) {
                    endReached = true;
                } else if (await pick.elem.getAttribute('aria-posinset') === await pick.elem.getAttribute('aria-setsize')) {
                    endReached = true;
                }
                if (typeof indexOrText === 'string') {
                    const text = await pick.getLabel();
                    if (text.indexOf(indexOrText) > -1) {
                        return pick;
                    }
                } else if (indexOrText === pick.getIndex()){
                    return pick;
                }
            }
            if (!endReached) {
                await input.addValue(['PageDown']);
            }
        }
        return undefined;
    }

    /**
     * Retrieve the title of an input box if it has one
     * @returns Promise resolving to title if it exists, to undefined otherwise
     */
    async getTitle(): Promise<string | undefined> {
        const titleBar = await this.titleBar$$;
        if (titleBar.length > 0 && await titleBar[0].isDisplayed()) {
            return (await titleBar[0].$(this.locators.title)).getText();
        }
        return undefined
    }

    /**
     * Click on the back button if it exists
     * @returns Promise resolving to true if a button was clicked, to false otherwise
     */
    async back(): Promise<boolean> {
        const titleBar = await this.titleBar$$;
        if (titleBar.length > 0 && await titleBar[0].isDisplayed()) {
            const backBtn = await titleBar[0].$$(this.locators.backButton);
            if (backBtn.length > 0 && await backBtn[0].isEnabled()) {
                await backBtn[0].click();
                return true;
            }
        }
        return false;
    }

    /**
     * Find whether the input box has an active progress bar
     * @returns Promise resolving to true/false
     */
    abstract hasProgress(): Promise<boolean>

    /**
     * Retrieve the quick pick items currently available in the DOM
     * (visible in the quick pick menu)
     * @returns Promise resolving to array of QuickPickItem objects
     */
    abstract getQuickPicks(): Promise<QuickPickItem[]>

    private async resetPosition(): Promise<void> {
        const text = await this.getText();
        await this.clear();
        await this.setText(text);
    }
}

/**
 * Page object representing a quick pick option in the input box
 */
export interface QuickPickItem extends IPluginDecorator<typeof input.Input> {}
@PluginDecorator(input.Input)
export class QuickPickItem extends BasePage {
    private index: number;
    public input: Input

    constructor(locators: typeof input.Input, index: number, inputField: Input) {
        super(locators, input instanceof QuickOpenBox ? locators.quickPickPosition(index) : locators.quickPickIndex(index));
        this.index = index;
        this.input = inputField
    }

    /**
     * Get the label of the quick pick item
     */
    async getLabel(): Promise<string> {
        return this.quickPickLabel$.getText();
    }

    /**
     * Get the description of the quick pick item
     */
    async getDescription(): Promise<string | undefined> {
        try {
            return this.quickPickDescription$.getText();
        } catch (err) {
            return undefined;
        }
    }

    /**
     * Get the index of the quick pick item
     */
    getIndex(): number {
        return this.index;
    }

    /**
     * Select (click) the quick pick item
     * @returns Promise resolving when the item has been clicked
     */
    async select(): Promise<void> {
        await this.elem.click();
    }
}